loadAPI(2);

host.defineController("Novation", "Launch Control XL", "1.0", "aad503e8-e980-4756-a30c-fd93b5f2595f", "Netsu");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control XL"], ["Launch Control XL"]);
host.defineSysexIdentityReply('F0 7E 00 06 02 00 20 29 61 00 00 00 00 00 03 06 F7');

//Load LaunchControl constants containing the status for pages and other constant variables
load("launch-control-xl.constants.js");
load("launch-control-xl.utils.js");

var buttonMode = ButtonMode.SOLO;
var knobMode = KnobMode.PERFORM;

var playbackStates = makeArray(NUM_TRACKS, PlaybackState.STOPPED);
var playbackStatesClips = makeTable(NUM_TRACKS, NUM_SCENES, PlaybackState.STOPPED);

var muteStates      = [false, false, false, false, false, false, false, false];
var soloStates      = [false, false, false, false, false, false, false, false];
var recordStates    = [false, false, false, false, false, false, false, false];
var deviceStates    = [false, false, false, false, false, false, false, false];
var stoppedStates   = makeTable(NUM_TRACKS, MAX_CHILD_TRACKS + 1, true);
var queuedStates    = makeTable(NUM_TRACKS, MAX_CHILD_TRACKS + 1, false);

var deviceCursors           = [];
var controlPageCursors      = [];
var childTracks             = [];
var childTrackCount         = [];
var childDeviceCursors      = [];
var childControlPageCursors = [];
var sendBanks               = [];
var currentTime;

// OBSERVER FUNCTIONS //

var childrenCountObserver = function(channel)
{
    var ch = channel;
    return function (count)
    {
        if (count > MAX_CHILD_TRACKS)
        {
            count = MAX_CHILD_TRACKS;
        }
        childTrackCount[ch] = count;
    }
};

var playbackObserver = function(channel)
{
    var ch = channel;
    return function (slot, state, queued)
    {
        //println(ch + " " + slot + " " + state + " " + queued);
        if (state == 0 && !queued)
        {
            playbackStatesClips[ch][slot] = PlaybackState.STOPPED;
        }
        else if (state == 0 && queued)
        {
            playbackStatesClips[ch][slot] = PlaybackState.STOPDUE;
        }
        else if (state == 1 && queued)
        {
            playbackStatesClips[ch][slot] = PlaybackState.QUEUED;
        }
        else if (state == 1 && !queued)
        {
            playbackStatesClips[ch][slot] = PlaybackState.PLAYING;
        }
        
        playbackStates[ch] = PlaybackState.STOPPED;
        for (var i = 0; i < NUM_SCENES; i++)
        {
            if (playbackStatesClips[ch][i] > playbackStates[ch])
            {
                playbackStates[ch] = playbackStatesClips[ch][i];
            }
        }
        
        updatePad(ch);
    }
};

var stoppedObserver = function(track, child)
{
    var t = track;
    var ch = child;
    return function (stopped)
    {
        stoppedStates[t][ch] = stopped;
        
        playbackStates[t] = PlaybackState.STOPPED;
        for (var i = 0; i < childTrackCount[t] + 1; i++)
        {
            if (stoppedStates[t][i] == false)
            {
                playbackStates[t] = PlaybackState.PLAYING;
            }
        }
        
        updatePad(t);
    }
};

var queuedForStopObserver = function(track, child)
{
    var t = track;
    var ch = child;
    return function (queued)
    {
        queuedStates[t][ch] = queued;
        if (queued)
        {
            playbackStates[t] = PlaybackState.STOPDUE;
            updatePad(t);
        }
    }
};

var muteObserver = function(channel)
{
    var ch = channel;
    return function (mute)
    {
        muteStates[ch] = mute;
        updatePad(ch+8);
    }
};

var sendObserver = function(channel, send)
{
    var ch = channel;
    return function (send_amount)
    {
        if (send == DEVICE_SEND)
        {
            deviceStates[ch] = send_amount != 0;
            updatePad(ch+8);
        }
    }
};

var macroObserver = function(channel, macro)
{
    var ch = channel;
    return function (macro_amount)
    {
        if (macro == DEVICE_MACRO)
        {
            deviceStates[ch] = macro_amount != 0;
            updatePad(ch+8);
        }
    }
};

var crossfadeObserver = function(value)
{
    if (value == 0)
    {
        sendMidi(UserPageCCs.Page1, ArrowButton.LEFT, ArrowButtonColour[2]);
        sendMidi(UserPageCCs.Page1, ArrowButton.RIGHT, ArrowButtonColour[0]);
    }
    else if (value == 1)
    {
        sendMidi(UserPageCCs.Page1, ArrowButton.LEFT, ArrowButtonColour[0]);
        sendMidi(UserPageCCs.Page1, ArrowButton.RIGHT, ArrowButtonColour[2]);
    }
    else
    {
        sendMidi(UserPageCCs.Page1, ArrowButton.LEFT, ArrowButtonColour[1]);
        sendMidi(UserPageCCs.Page1, ArrowButton.RIGHT, ArrowButtonColour[1]);
    }
}

var soloObserver = function(channel)
{
    var ch = channel;
    return function (solo)
    {
        soloStates[ch] = solo;
        updatePad(ch+8);
    }
};

var recordObserver = function(channel)
{
    var ch = channel;
    return function (record)
    {
        recordStates[ch] = record;
        updatePad(ch+8);
    }
};

// INIT FUNCTION //

function init()
{
    // Setup MIDI in stuff
    host.getMidiInPort(0).setMidiCallback(onMidi);

    // create a trackbank (arguments are tracks, sends, scenes)
    trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);
    transport = host.createTransport();
    transport.getCrossfade().addValueObserver(crossfadeObserver);

    var slotBanks = [];

    transport.getPosition().addTimeObserver(":", 2, 1, 1, 0  , function(value)
	{
        if (value != currentTime)
        {
            currentTime = value;
            updateOnBeat();
        }
	});

    for (var i = 0; i < NUM_TRACKS; i++)
    {
        // create main device cursor for the track
        deviceCursors[i] = trackBank.getChannel(i).createDeviceBank(1);
        controlPageCursors[i] = deviceCursors[i].getDevice(0).createCursorRemoteControlsPage(3);

        childTracks[i] = trackBank.getChannel(i).createTrackBank(MAX_CHILD_TRACKS, 0, 0, false);
        childTracks[i].channelCount().addValueObserver(childrenCountObserver(i));

        // create child track cursors for the track, one for each potential child
        var childDeviceCursorsArray = [];
        var childControlPageCursorsArray = [];
        for (var j = 0; j < MAX_CHILD_TRACKS; j++)
        {
            childDeviceCursorsArray[j] = childTracks[i].getChannel(j).createDeviceBank(1);
            childControlPageCursorsArray[j] = childDeviceCursorsArray[j].getDevice(0).createCursorRemoteControlsPage(3);
        }
        
        childDeviceCursors[i] = childDeviceCursorsArray;
        childControlPageCursors[i] = childControlPageCursorsArray;

        slotBanks[i] = trackBank.getChannel(i).getClipLauncherSlots();
        slotBanks[i].addPlaybackStateObserver(playbackObserver(i));

        trackBank.getChannel(i).getMute().addValueObserver(muteObserver(i));
        trackBank.getChannel(i).getSolo().addValueObserver(soloObserver(i));
        trackBank.getChannel(i).getArm().addValueObserver(recordObserver(i));
        
        sendBanks[i] = trackBank.getChannel(i).sendBank();

        //sendBanks[i].getItemAt(DEVICE_SEND).addValueObserver(sendObserver(i, DEVICE_SEND));
        
        controlPageCursors[i].getParameter(DEVICE_MACRO).addValueObserver(macroObserver(i, DEVICE_MACRO));
    }
    
    updatePads();
}

// UPDATE LEDS //

function updateOnBeat()
{
    if (parseInt(currentTime.split(":")[2]) <= 2)
    {
        sendMidi(UserPageCCs.Page1, ArrowButton.UP, ArrowButtonColour[2]);
        sendMidi(UserPageCCs.Page1, ArrowButton.DOWN, ArrowButtonColour[2]);
    }
    else
    {
        sendMidi(UserPageCCs.Page1, ArrowButton.UP, ArrowButtonColour[0]);
        sendMidi(UserPageCCs.Page1, ArrowButton.DOWN, ArrowButtonColour[0]);
    }
}

function updatePads()
{
    for (var i = 0; i < 16; i++)
    {
        updatePad(i);
    }

    sendMidi(UserPageNotes.Page1, SideButton.SOLO, SideButtonColour[buttonMode == ButtonMode.SOLO ? 1 : 0]);
    sendMidi(UserPageNotes.Page1, SideButton.MUTE, SideButtonColour[buttonMode == ButtonMode.MUTE ? 1 : 0]);
    sendMidi(UserPageNotes.Page1, SideButton.RECORD, SideButtonColour[buttonMode == ButtonMode.RECORD ? 1 : 0]);
    sendMidi(UserPageNotes.Page1, SideButton.DEVICE, SideButtonColour[buttonMode == ButtonMode.DEVICE ? 1 : 0]);
}

function updatePad(pad)
{
    if (pad < 8)
    {
        var state = playbackStates[pad];
        sendMidi(UserPageNotes.Page1, ButtonReverseMap[pad], PlaybackStateColour[state]);
    }
    else
    {
        if (buttonMode == ButtonMode.MUTE)
        {
            sendMidi(UserPageNotes.Page1, ButtonReverseMap[pad], MuteColour[muteStates[pad - 8] ? 1 : 0]);
        }
        else if (buttonMode == ButtonMode.SOLO)
        {
            sendMidi(UserPageNotes.Page1, ButtonReverseMap[pad], SoloColour[soloStates[pad - 8] ? 1 : 0]);
        }
        else if (buttonMode == ButtonMode.RECORD)
        {
            sendMidi(UserPageNotes.Page1, ButtonReverseMap[pad], RecordColour[recordStates[pad - 8] ? 1 : 0]);
        }
        else if (buttonMode == ButtonMode.DEVICE)
        {
            sendMidi(UserPageNotes.Page1, ButtonReverseMap[pad], DeviceColour[deviceStates[pad - 8] ? 1 : 0]);
        }
    }
}

// PROCESS MIDI //

function processSideButtons(status, data1, data2)
{
    if (status == UserPageNotes.Page1)
    {
        if (data1 == SideButton.MUTE && data2 == 127)
        {
            buttonMode = ButtonMode.MUTE;
            updatePads();
        }
        else if (data1 == SideButton.SOLO && data2 == 127)
        {
            buttonMode = ButtonMode.SOLO;
            updatePads();
        }
        else if (data1 == SideButton.RECORD && data2 == 127)
        {
            buttonMode = ButtonMode.RECORD;
            updatePads();
        }
        else if (data1 == SideButton.DEVICE && data2 == 127)
        {
            buttonMode = ButtonMode.DEVICE;
            updatePads();
        }
    }
    else if (status == UserPageCCs.Page1)
    {   
        if (data1 == ArrowButton.UP && data2 == 127)
        {
            transport.getTempo().incRaw(1);
        }
        else if (data1 == ArrowButton.DOWN && data2 == 127)
        {
            transport.getTempo().incRaw(-1);
        }
        else if (data1 == ArrowButton.LEFT && data2 == 127)
        {
            transport.getCrossfade().set(0, 128);
        }
        else if (data1 == ArrowButton.RIGHT && data2 == 127)
        {
            transport.getCrossfade().set(127, 128);
        }
    }
}

function onMidi(status, data1, data2)
{
    //printMidi(status, data1, data2);

    processSideButtons(status, data1, data2);

    // Buttons
    if (status == UserPageNotes.Page1 && ButtonMap[data1] >= 0 && ButtonMap[data1] <= 15)
    {
        var button = ButtonMap[data1];
        var ch = button % 8;
        
        if (button < 8)
        {
            trackBank.getChannel(ch).stop();
            // hack for groups that don't send stop info to observer
            if (playbackStates[ch] == PlaybackState.PLAYING)
            {
                playbackStates[ch] = PlaybackState.STOPDUE;
            }
        }
        else
        {
            if (buttonMode == ButtonMode.MUTE && data2 == 127)
            {
                trackBank.getChannel(ch).getMute().toggle();
            }
            else if (buttonMode == ButtonMode.SOLO && data2 == 127)
            {
                trackBank.getChannel(ch).getSolo().toggle(false);
            }
            else if (buttonMode == ButtonMode.RECORD && data2 == 127)
            {
                trackBank.getChannel(ch).getArm().toggle();
            }
            else if (buttonMode == ButtonMode.DEVICE && data2 == 127)
            {
                if (deviceStates[ch] == true)
                    //sendBanks[ch].set(0, 128);
                    controlPageCursors[ch].getParameter(DEVICE_MACRO).set(0, 128);
                else
                    //sendBanks[ch].set(127, 128);
                    controlPageCursors[ch].getParameter(DEVICE_MACRO).set(127, 128);
            }
        }
        updatePad(button);
    }
    // First two knobs control first two macros of each channel
    else if (status == UserPageCCs.Page1 && KnobMap[data1] >= 0 && KnobMap[data1] < 16)
    {
        var channelIdx = KnobMap[data1] % 8;
        var macro = KnobMap[data1] / 8;

        //println(childTrackCount[channelIdx]);

        deviceCursors[channelIdx].scrollTo(0);
        controlPageCursors[channelIdx].getParameter(macro).set(data2, 128);
        for (var i = 0; i < childTrackCount[channelIdx]; i++)
        {
            childDeviceCursors[channelIdx][i].scrollTo(0);
            childControlPageCursors[channelIdx][i].getParameter(macro).set(data2, 128);
        }
    }
    // the third knob controls the first send
    else if (status == UserPageCCs.Page1 && KnobMap[data1] >= 16 && KnobMap[data1] < 24)
    {
        var channelIdx = KnobMap[data1] % 8;
        var send = 0;

		// workaround for the send knob lagging when moving to/from -inf
		if (data2 == 0) data2 = 1;

        sendBanks[channelIdx].getItemAt(send).set(data2, 128);
    }
    // Faders
    else if (status == UserPageCCs.Page1 && FaderMap[data1] >= 0 && FaderMap[data1] < 8)
    {
        var channelIdx = FaderMap[data1];
        
        // to map the faders to 0db maximum, set the max value in the XL Editor to 102
        if (childTrackCount[channelIdx] == 0)
        {
            trackBank.getChannel(channelIdx).getVolume().set(data2, 128);
        }
        else
        {
            for (var i = 0; i < childTrackCount[channelIdx]; i++)
            {       
                childTracks[channelIdx].getChannel(i).getVolume().set(data2, 128);
            }
        }
    }
}

function exit()
{
   sendMidi(0xB8, 0x00, 0x00);
}
