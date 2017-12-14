var NUM_TRACKS = 8;
var NUM_SENDS = 3;
var NUM_SCENES = 1;
var MAX_CHILD_TRACKS = 5;

var DEVICE_SEND = 1;
var SELECT_MACRO = 2;
var DEVICE_MACRO = 3;

var SYSEX_HEADER = "F0 00 20 29 02 11 78 ";

var Colour = // Novation are from the UK
{
   OFF:12,
   RED_LOW:13,
   RED_FULL:15,
   AMBER_LOW:29,
   AMBER_FULL:63,
   YELLOW_FULL:62,
   GREEN_LOW:28,
   GREEN_FULL:60,
   RED_FLASHING:11,
   AMBER_FLASHING:59,
   YELLOW_FLASHING:58,
   GREEN_FLASHING:56
};

var PlaybackState =
{
    STOPPED:0,
    QUEUED:1,
    STOPDUE:2,
    PLAYING:3
};

var PlaybackStateColour =
[
	Colour.OFF,
	Colour.GREEN_FULL,
	Colour.YELLOW_FULL,
	Colour.GREEN_LOW
];

var MuteColour =
[
    Colour.OFF,
    Colour.RED_FULL
];

var RecordColour =
[
    Colour.OFF,
    Colour.RED_FULL
];

var SoloColour =
[
    Colour.OFF,
    Colour.YELLOW_FULL
];

var DeviceColour =
[
    Colour.OFF,
    Colour.YELLOW_FULL
];


var ArrowButtonColour =
[
	Colour.OFF,
    Colour.RED_LOW,
    Colour.RED_FULL
];

var SideButtonColour =
[
    Colour.OFF,
    Colour.AMBER_FULL
];

var ArrowButton =
{
    UP:104,
    DOWN:105,
    LEFT:106,
    RIGHT:107
};
    
var SideButton =
{
    DEVICE:105,
    MUTE:106,
    SOLO:107,
    RECORD:108
};

var ButtonMode =
{
    SOLO:0,
    MUTE:1,
    DEVICE:2,
    RECORD:3
};

var KnobMode =
{
	PERFORM:0,
	MIX:1
};

var KnobMap = 
{
    '13':0,  '14':1,  '15':2,  '16':3,  '17':4,  '18':5,  '19':6,  '20':7,
    '29':8,  '30':9,  '31':10, '32':11, '33':12, '34':13, '35':14, '36':15,
    '49':16, '50':17, '51':18, '52':19, '53':20, '54':21, '55':22, '56':23
};

var sysexKnobs =
[
	'00', '01', '02', '03', '04', '05', '06', '07',
	'08', '09', '0A', '0B', '0C', '0D', '0E', '0F',
	'10', '11', '12', '13', '14', '15', '16', '17'
];

var meterColours =
[
	[Colour.OFF, Colour.OFF, Colour.OFF],
	[Colour.OFF, Colour.OFF, Colour.GREEN_LOW],
	[Colour.OFF, Colour.OFF, Colour.GREEN_FULL],
	[Colour.OFF, Colour.AMBER_LOW, Colour.GREEN_FULL],
	//[Colour.OFF, Colour.YELLOW_FULL, Colour.GREEN_FULL],
	[Colour.OFF, Colour.AMBER_FULL, Colour.GREEN_FULL],
	//[Colour.AMBER_FULL, Colour.YELLOW_FULL, Colour.GREEN_FULL],
	[Colour.RED_LOW, Colour.YELLOW_FULL, Colour.GREEN_FULL],
	[Colour.RED_FULL, Colour.YELLOW_FULL, Colour.GREEN_FULL]
];

/*var meterColours =
[
	[Colour.OFF],
	[Colour.GREEN_LOW],
	[Colour.GREEN_FULL],
	//[Colour.AMBER_LOW],
	[Colour.YELLOW_FULL],
	[Colour.AMBER_FULL],
	[Colour.RED_LOW],
	[Colour.RED_FULL]
];*/

var FaderMap = {'77':0, '78':1, '79':2, '80':3, '81':4, '82':5, '83':6, '84':7};

var ButtonMap = 
{
    '41':0, '42':1, '43':2,  '44':3,  '57':4,  '58':5,  '59':6,  '60':7,
    '73':8, '74':9, '75':10, '76':11, '89':12, '90':13, '91':14, '92':15
};

var ButtonReverseMap = 
{
    '0':41, '1':42, '2':43,  '3':44,  '4':57,  '5':58,  '6':59,  '7':60,
    '8':73, '9':74, '10':75, '11':76, '12':89, '13':90, '14':91, '15':92
};


var KnobLeds = [
    [13, 29, 45, 61, 77, 93, 109, 125],
    [14, 30, 46, 62, 78, 94, 110, 126],
    [15, 31, 47, 63, 79, 95, 111, 127]
];


var UserPageCCs =
{
    Page1:176,
    Page2:177,
    Page3:178,
    Page4:179,
    Page5:180,
    Page6:181,
    Page7:182,
    Page8:183
};

var FactoryPageCCs =
{
    Page1:184,
    Page2:185,
    Page3:186,
    Page4:187,
    Page5:188,
    Page6:189,
    Page7:190,
    Page8:191
};

var UserPageNotes =
{
    Page1:144,
    Page2:145,
    Page3:146,
    Page4:147,
    Page5:148,
    Page6:149,
    Page7:150,
    Page8:151
};

var FactoryPageNotes =
{
    Page1:152,
    Page2:153,
    Page3:154,
    Page4:155,
    Page5:156,
    Page6:157,
    Page7:158,
    Page8:159
};
