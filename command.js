var commands = [];

function cmd(info, func) {
    var data = info;
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';
    if (!data.fromMe) data.fromMe = false; // <<< default to false
    if (!info.category) info.category = 'misc';
    if (!info.filename) info.filename = "Not Provided";
    commands.push(data);
    return data;
}

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,
};
