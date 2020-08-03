const Discord = require("discord.js");
const ytdl = require("ytdl-core");

const token = require("./token.json").token;

const prefix = require("./prefix.json").prefix;

const bot = new Discord.Client();

var servers = {};

function wrongCommandError(message) {
    message.channel.send('The command doesn\'t exist');
}

function argumentMissingError(message) {
    message.channel.send('Missing argument');
}

bot.on('ready', async () => {
    console.log('Bot online');
	bot.user.setActivity(prefix + 'help', { type: 'PLAYING' })
        .catch(console.error);
});

bot.on('message', message => {

    if(message.content.charAt(0) == prefix) {

        let args = message.content.substring(prefix.length).split(" ");
        let embed = new Discord.MessageEmbed();

        switch(args[0]) {
            case "help":
                
                embed.setTitle("Commands (prefix " + prefix + ")")
                .addField("help", "This message with all the available commands")
                .addField("play", "Plays the audio of a youtube video")
                .addField("skip", "Skip to the next track in the list, if there isn't any it leaves the voice channel")
                .addField("stop", "Leaves the voice channel")
                .addField("queue", "Display the queue");
                
                message.channel.send(embed);
                break;

            case "play":

                function play(connection, message) {
                    var server = servers[message.guild.id];

                    server.dispatcher = connection.play(ytdl(server.queue[0], {filter: "audioonly"}));

                    server.queue.shift();

                    server.dispatcher.on("finish", () => {
                        server.titles.shift();
                        if(server.queue[0]) {
                            play(connection, message);
                        }
                        else {
                            connection.disconnect();
                        }

                    });
                }

                var re = /(?:https?:\/\/)?(?:(?:www\.|m.)?youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9-_]{11})/;

                if(!args[1] || !re.test(args[1])) {
                    message.channel.send("No valid youtube link provided");
                    return;
                }
                
                if(!message.member.voice.channel) {
                    message.channel.send("You must be in a voice channel");
                    return;
                }

                if(!servers[message.guild.id]) servers[message.guild.id] = {
                    queue: [],
                    titles: []
                };

                var server = servers[message.guild.id];

                server.queue.push(args[1]);
                
                var title = "";

                ytdl.getBasicInfo (args[1], async (err, info) => {
                    title = await info.videoDetails.title;
                    
                    server.titles.push(title);
                });
                
                if(bot.voice.connections.size==0) message.member.voice.channel.join().then(connection => {
                    play(connection, message);
                })
                message.react("👌");

                break;

            case "skip":

                var server = servers[message.guild.id];

                if(bot.voice.connections.size==1) {
                    
                    server.dispatcher.end();

                    message.react("👌");
                }
                
                break;

            case "stop":

                var server = servers[message.guild.id];

                if(bot.voice.connections.size==1) {
                    for(var i=server.queue.length-1;i>=0;i--) {
                        server.queue.splice(i, 1);
                        server.titles.splice(i, 1);
                    }
                    
                    server.dispatcher.end();
                    message.react("👌");
                }
                
                break;

            case "queue":

                var server = servers[message.guild.id];

                if(server.titles.length == 0) {
                    embed.setTitle("No song queued");
                }
                else {

                    let songsList = "1 - " + server.titles[0] + " (currently playing)";

                    embed.setTitle("Queue (" + server.titles.length + ")");
                    
                    for(let i=1;i<server.titles.length;i++) {
                        songsList = songsList.concat("\n" + (i+1).toString() + " - " + server.titles[i]);
                    }
                    
                    embed.addField("Queued songs:", songsList);

                }

                message.channel.send(embed);
                
                break;

            default:
                wrongCommandError(message);
                
                break;
        }

    }

});

bot.login(token);