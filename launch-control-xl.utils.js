function toHex(d)
{
    return  ("0"+(Number(Math.round(d)).toString(16))).slice(-2).toUpperCase()
}

function makeTable(x, y, init)
{
	var table = new Array(x);
	for (var i = 0; i < x; i++)
	{
		table[i] = new Array(y);
		for (var j = 0; j < y; j++)
		{
			table[i][j] = init;
		}
	}
	return table;
}

function makeArray(x, init)
{
	var table = new Array(x);
	for (var i = 0; i < x; i++)
	{
		table[i] = init;
	}
	return table;
}
