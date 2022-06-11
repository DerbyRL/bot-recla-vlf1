const fs = require('fs');
const path = require('path');
const discord = require("discord.js");
const { MessageActionRow, MessageSelectMenu, MessageButton, MessageCollector } = require('discord.js');
require('dotenv').config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const conf = require('./config.json');

const client = new discord.Client({ 
    intents: [
        discord.Intents.FLAGS.GUILDS,
        discord.Intents.FLAGS.GUILD_MESSAGES, // messages serveur discord
        // discord.Intents.FLAGS.DIRECT_MESSAGES // messages privés
    ]
});

var c = {
    leagues: conf.leagues,
    teams: conf.teams,
    recla_channel: conf.recla_channel,
    recla_category: conf.recla_category,
    admin_role: conf.admin_role,
    driver_role: conf.driver_role,
    reclas: conf.reclas
}

const PREFIX = "p!recla ";
const CONFIG_PREFIX = "p!config ";

var leagues = [];
var league_options = [];

client.on("ready", async () => {
    console.log("Bot opérationnel");
});

client.on("messageCreate", message => {
    if(message.channel.id == conf.recla_channel){
        if(message.content.startsWith(PREFIX)){
            if(message.member.roles.cache.has(conf.driver_role)){
                message.delete();
                var end = message.content.split(PREFIX);
                var users = getUsers(end[1]);
                
                message.guild.channels.create("récla-de-" + message.author.username, {
                    type: 'text',
                    parent: c.recla_category,
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.everyone,
                            allow: [],
                            deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                        },
                        {
                            id: c.admin_role,
                            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                            deny: []
                        },
                        {
                            id: message.member.id,
                            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                            deny: []
                        }
                    ]
                }).then(channel => {
                    users.push(message.member.id);
                    var userLeague = getUserLeague(message);
                    var r = {
                        author: message.member.id,
                        league: userLeague.id,
                        instant: null,
                        drivers: users
                    }
                    var channelId = channel.id;
                    c.reclas[channelId] = r;
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                    getLeagues(message.guild);
                    buildLeagueOptions(message);
                    const rowLeague = new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                                .setCustomId('league')
                                .setPlaceholder('Aucune ligue sélectionnée')
                                .addOptions(league_options),
                    );

                    const rowInstant = new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                                .setCustomId('instant')
                                .setPlaceholder('Aucun moment sélectionné')
                                .addOptions([
                                    {
                                        label: "Q1",
                                        value: "q1"
                                    },
                                    {
                                        label: "Q2",
                                        value: "q2"
                                    },
                                    {
                                        label: "Q3",
                                        value: "q3"
                                    },
                                    {
                                        label: "Qualifs",
                                        value: "qualifs"
                                    },
                                    {
                                        label: "Course (préciser le tour)",
                                        value: "race"
                                    },
                                    {
                                        label: "Autre (préciser)",
                                        value: "other"
                                    },
                                ]),
                    );
                    
                    const rowSubmit = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                            .setCustomId('submit')
                            .setLabel('Créer la réclamation')
                            .setStyle('DANGER'),
                    );
        
                    channel.send({ content: 'Voici le formulaire à renseigner:', components: [rowLeague, rowInstant, rowSubmit] });
                })
                // for(let i = 0 ; i< roles.length ; i++){
                //     var role = roles[i];
                //     if(!conf.leagues.includes(role.id)){
                //         conf.leagues.push(role.id);
                //         fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                //         message.reply("La ligue " + role.name + " a été ajoutée");
                //     }else{
                //         message.reply("La ligue " + role.name + " existe déjà dans la configuration du bot");
                //     }
                // }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }
    }else if(message.channel.id == process.env.CONFIG_CHANNEL){
        if( message.content.startsWith("!leagues")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                for(let i=0 ; i < conf.leagues.length ; i++){
                    console.log("Ligue " + conf.leagues[i]);
                    message.channel.send("Ligue " + conf.leagues[i] + " <@&" + conf.leagues[i] + ">")
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if( message.content.startsWith("!teams")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                for(let i=0 ; i < conf.teams.length ; i++){
                    console.log("Ecurie " + conf.teams[i]);
                    message.channel.send("Ecurie " + conf.teams[i] + "<@&" + conf.teams[i] + ">")
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "add-league")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "add-league");
                var roles = getRoles(message, end[1]);
                for(let i = 0 ; i< roles.length ; i++){
                    var role = roles[i];
                    if(!conf.leagues.includes(role.id)){
                        conf.leagues.push(role.id);
                        fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                        message.reply("La ligue " + role.name + " a été ajoutée");
                    }else{
                        message.reply("La ligue " + role.name + " existe déjà dans la configuration du bot");
                    }
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "remove-league")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
            var end = message.content.split(CONFIG_PREFIX + "remove-league");
            var roles = getRoles(message, end[1]);
            for(let i = 0 ; i< roles.length ; i++){
                var role = roles[i];
                if(conf.leagues.includes(role.id)){
                    conf.leagues.pop(role.id);
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                    message.reply("L'écurie " + role.name + " a bien été supprimée");
                }else{
                    message.reply("L'écurie " + role.name + " n'existe pas dans la configuration du bot, elle ne peut donc pas être supprimée!");
                }
            }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "add-team")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
            var end = message.content.split(CONFIG_PREFIX + "add-team");
            var roles = getRoles(message, end[1]);
            for(let i = 0 ; i< roles.length ; i++){
                var role = roles[i];
                if(!conf.teams.includes(role.id)){
                    conf.teams.push(role.id);
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                    message.reply("L'écurie " + role.name + " a été ajoutée");
                }else{
                    message.reply("L'écurie " + role.name + " existe déjà dans la configuration du bot");
                }
            }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "remove-team")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
            var end = message.content.split(CONFIG_PREFIX + "remove-team");
            var roles = getRoles(message, end[1]);
            for(let i = 0 ; i< roles.length ; i++){
                var role = roles[i];
                if(conf.teams.includes(role.id)){
                    conf.teams.pop(role.id);
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                    message.reply("L'écurie " + role.name + " a bien été supprimée");
                }else{
                    message.reply("L'écurie " + role.name + " n'existe pas dans la configuration du bot, elle ne peut donc pas être supprimée!");
                }
            }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "recla-channel")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "recla-channel");
                let channel = getChannel(message, end[1]);
                if(channel != undefined){
                    c.recla_channel = channel.id;
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

                    message.reply("Salon " + channel.name + " défini comme salon des réclamations");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "recla-category")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "recla-category");
                if(end[1] != undefined){
                    c.recla_category = end[1].trim();
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
                    message.reply("Catégorie des réclamations définie");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "admin-role")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "admin-role");
                let role = getRole(message, end[1]);
                if(role != undefined){
                    c.admin_role = role.id;
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

                    message.reply("Role " + role.name + " défini comme rôle nécessaire pour voir et gérer les réclamations");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "driver-role")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "driver-role");
                let role = getRole(message, end[1]);
                if(role != undefined){
                    c.driver_role = role.id;
                    fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

                    message.reply("Role " + role.name + " défini comme rôle nécessaire pour voir et gérer les réclamations");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "clear-reclas")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                c.reclas = {};
                fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

                const category = message.guild.channels.cache.get(c.recla_category); // You can use `find` instead of `get` to fetch the category using a name: `find(cat => cat.name === 'test')
                category.children.forEach(channel => channel.delete())
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "clear-leagues")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                c.leagues = [];
                fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "clear-teams")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                c.teams = [];
                fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "help")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                
                const helpEmbed = new discord.MessageEmbed()
                .setColor("#ffffff")
                .addField("__!leagues__", "Affiche la liste des ligues")
                .addField("__!teams__", "Affiche la liste des écuries")
                .addField("__p!config add-league__", "Permet d'ajouter une ligue")
                .addField("__p!config remove-league__", "Permet de supprimer une ligue")
                .addField("__p!config add-team__", "Permet d'ajouter une écurie")
                .addField("__p!config remove-team__", "Permet de supprimer une écurie")
                .addField("__p!config recla-channel__", "Assigne le salon des réclamations")
                .addField("__p!config recla-category__", "Assigne la catégorie des réclamations")
                .addField("__p!config admin-role__", "Assigne le rôle d'administration des réclamations")
                .addField("__p!config driver-role__", "Assigne le rôle de pilote")
                .addField("__p!config clear-reclas__", "Supprimes toutes les réclamations")
                // .addField("__p!config status__", "Supprimes toutes les réclamations")
                ;

                message.reply({embeds: [helpEmbed]});
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }
    }
})

client.on('interactionCreate', async interaction => {
	if(interaction.isSelectMenu()){
        if(interaction.customId == 'league'){
            var channelId = interaction.channel.id;
            var value = interaction.values[0];
            c.reclas[channelId].league = value;
            fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

            interaction.deferUpdate();
            return;
        }else if(interaction.customId == 'instant'){
            var channelId = interaction.channel.id;
            var value = interaction.values[0];
            c.reclas[channelId].instant = value;
            fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(c));

            interaction.deferUpdate();
            return;
        }
    }else if(interaction.isButton()){
        var channel = interaction.channel;
        var author = c.reclas[channel.id].author;
        if(author == interaction.member.id){
            author = getUser(author);
            var authorTeam = getUserTeam(interaction, author); 
            var teamName = "Inconnu";
            if(authorTeam != null){
                teamName = authorTeam.name;
            }
            var instant = c.reclas[channel.id].instant;
            var league = c.reclas[channel.id].league;

            if(instant != null && league != null){
                league = getLeague(interaction.guild, league);
                switch(instant){
                    case "q1":
                        instant = "Q1"; break
                    case "q2":
                        instant = "Q2"; break
                    case "q3":
                        instant = "Q3"; break
                    case "qualifs":
                        instant = "Qualifs"; break
                    case "race":
                        instant = "Course"; break
                    case "other":
                        instant = "Auth"; break
                }

                var embeds = [];
                const headerEmbed = new discord.MessageEmbed()
                    .setTitle("Réclamation de " + author.username)
                    .setThumbnail("https://www.architectes.ch/media/image/5//fia-federation-internationale-de-l-automobile_logo-1.png")
                    .setColor("#ffffff")
                    .setAuthor({name: "FIA", iconURL: "https://www.architectes.ch/media/image/5//fia-federation-internationale-de-l-automobile_logo-1.png"})
                    .addFields(
                        { name: 'Ligue', value: league.name, inline: true },
                        { name: 'Moment de l\'action', value: instant, inline: true}
                    );
                embeds.push(headerEmbed);

                const authorEmbed = new discord.MessageEmbed()
                    .setTitle("Auteur de la réclamation ")
                    .setColor("#f01111")
                    // .setURL("https://support.discord.com/hc/en-us/community/posts/360051268213-discord-bot-token-2FA-feature-should-be-implemented-")
                    .addFields(
                        { name: 'De: ', value: author.username, inline: true },
                        { name: 'Ecurie: ', value: teamName, inline: true }
                    );
                embeds.push(authorEmbed);

                var drivers = c.reclas[channel.id].drivers;
                for(var i = 0 ; i < drivers.length ; i++){
                    var driver = drivers[i];
                    if(driver != author.id){
                        driver = getUser(driver);
                        var driverTeam = getUserTeam(interaction, driver); 
                        var teamName = "Inconnu";
                        if(driverTeam != null){
                            teamName = driverTeam.name;
                        }
            
                        const driverEmbed = new discord.MessageEmbed()
                            .setTitle("Pilote impliqué")
                            .setColor("#32a83e")
                            // .setURL("https://support.discord.com/hc/en-us/community/posts/360051268213-discord-bot-token-2FA-feature-should-be-implemented-")
                            .addFields(
                                { name: 'De: ', value: driver.username, inline: true },
                                { name: 'Ecurie: ', value: teamName, inline: true }
                            );
                        embeds.push(driverEmbed);
                        interaction.channel.permissionOverwrites.edit(driver.id, {'VIEW_CHANNEL': true, 'SEND_MESSAGES': true, 'READ_MESSAGE_HISTORY': true});
                        
                        // allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                    }
                }

                interaction.channel.send({ embeds: embeds });
                interaction.message.delete();
                interaction.deferUpdate();
            }else{
                interaction.deferUpdate();
            }
        }else{
            interaction.message.reply("Vous ne pouvez pas réagir à une réclamation dont vous n'êtes pas l'auteur");
            interaction.deferUpdate();
        }
    }
});

// client.on("messageCreate", message =>  {
//     if( message.author.bot ) return;

//     if( message.content === prefix + "ping"){
//         message.reply("pong");
//     }else if( message.content === prefix + "help" ){
//         const embed = new discord.MessageEmbed()
//             .setTitle("Liste des commandes")
//             .setDescription("Vous y trouverez la liste des commandes du bot")
//             .setThumbnail("https://www.architectes.ch/media/image/5//fia-federation-internationale-de-l-automobile_logo-1.png")
//             .setColor("#0099ff")
//             .setURL("https://support.discord.com/hc/en-us/community/posts/360051268213-discord-bot-token-2FA-feature-should-be-implemented-")
//             .setTimestamp()
//             .setAuthor({name: "FIA", iconURL: "https://www.architectes.ch/media/image/5//fia-federation-internationale-de-l-automobile_logo-1.png"})
//             .addField("__!help__", "Affiche la liste des commandes")
//             .addField("__!ping__", "Vous renvoie pong");

//         message.channel.send({embeds: [embed]});
//         // message.channel.send("** Besoin d'aide? **\nC'est par ici!")
//     }
//     // message.reply("message reçu!");
// })

function getUsers(msgContent){
    var userArray = [];
    var users = msgContent.split('>');
    for(var i = 0; i < users.length ; i++){
        if(users[i].includes('@')){
            var u = users[i].split('@')[1];
            const exists = client.users.cache.has(u);
            if(exists){
                userArray.push(u);
            }
        }
    }
    return userArray;
}

function getRoles(message, msgContent){
    var roleArray = [];
    var roles = msgContent.split('>');
    for(var i = 0; i < roles.length ; i++){
        if(roles[i].includes('&')){
            var u = roles[i].split('&')[1];
            let role = message.guild.roles.cache.find(x => x.id == u);
            if (typeof role !== undefined) {
                roleArray.push(role);
            }
        }
    }
    return roleArray;
}

function getRole(message, msgContent){
    var roles = msgContent.split('>');
    for(var i = 0; i < roles.length ; i++){
        if(roles[i].includes('&')){
            var u = roles[i].split('&')[1];
            let role = message.guild.roles.cache.find(x => x.id == u);
            if (typeof role !== undefined) {
                return role;
            }
        }
    }
    return null;
}

function getChannel(message, msgContent){
    var channels = msgContent.split('>');
    for(var i = 0; i < channels.length ; i++){
        if(channels[i].includes('#')){
            var u = channels[i].split('#')[1];
            let channel = message.guild.channels.cache.find(x => x.id == u);
            if (typeof channel !== undefined) {
                return channel;
            }
        }
    }
    return null;
}

function getLeagues(guild){
    leagues = [];

    for(let i=0 ; i < conf.leagues.length ; i++){
        let role = guild.roles.cache.find(x => x.id == conf.leagues[i]);
        leagues.push(role);
    }

    return leagues;
}

function getLeague(guild, leagueId){

    for(let i=0 ; i < conf.leagues.length ; i++){
        if(conf.leagues[i] == leagueId){
            return guild.roles.cache.find(x => x.id == conf.leagues[i]);
        }
    }

    return null;
}

function buildLeagueOptions(message){
    league_options = [];
    for(var i = 0 ; i < leagues.length ; i++){
        var r ={
            label: leagues[i].name,
            value: leagues[i].id,
            default: message.member.roles.cache.has(leagues[i].id)
        };
        league_options.push(r);
    }
}

function getUserLeague(message){
    for(var i = 0 ; i < conf.leagues.length ; i++){
        if(message.member.roles.cache.has(conf.leagues[i])){
            return message.guild.roles.cache.find(x => x.id == conf.leagues[i]);
        }
    }
    return null;
}

function getUser(userId){
    return client.users.cache.find(user => user.id === userId)
}

function getUserTeam(interaction, user)
{
    var u = interaction.guild.members.cache.get(user.id);
    for(var i = 0 ; i < conf.teams.length ; i++){
        if(u.roles.cache.has(conf.teams[i])){
            return u.roles.cache.find(x => x.id == conf.teams[i]);
        }
    }
    return null;
}

client.login(process.env.DISCORD_TOKEN);