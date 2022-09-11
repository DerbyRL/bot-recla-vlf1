const fs = require('fs');
const path = require('path');
const discord = require("discord.js");
const { MessageActionRow, MessageSelectMenu, MessageButton, MessageCollector } = require('discord.js');
require('dotenv').config();
// const { SlashCommandBuilder } = require("@discordjs/builders");
const config = require('./config.json');
const mongoose = require('mongoose');
const ConfigSchema = require('./ConfigSchema')
const ReclaSchema = require('./ReclaSchema')

const client = new discord.Client({ 
    intents: [
        discord.Intents.FLAGS.GUILDS,
        discord.Intents.FLAGS.GUILD_MESSAGES, // messages serveur discord
        // discord.Intents.FLAGS.DIRECT_MESSAGES // messages privés
    ]
});

var configuration;
var reclas;

const PREFIX = "p!recla ";
const CONFIG_PREFIX = "p!config ";

var league_options = [];
var leagueRoles = [];

var driver_role = "";
var admin_role = "";
var leagues = [];
var teams = [];
var recla_category = "";
var recla_channel = "";

client.on("ready", async () => {
    await mongoose.connect(process.env.DATABASE_URI,
        {
            keepAlive: true
        });

    setTimeout(async () => {

        configuration = await ConfigSchema.findOne({id: process.env.SERVER_ID});
        if(configuration){
            leagues = configuration.leagues;
            driver_role = configuration.driver_role;
            admin_role = configuration.admin_role;
            teams = configuration.teams;
            recla_category = configuration.recla_category;
            recla_channel = configuration.recla_channel;
        }else{
            await ConfigSchema.findOneAndUpdate(
                {
                    id: process.env.SERVER_ID
                },
                {
                    leagues: leagues,
                    driver_role: driver_role,
                    admin_role: admin_role,
                    teams: teams,
                    recla_category: recla_category,
                    recla_channel: recla_channel,
                },
                {
                    upsert: true
                }
            )
        }
    });

    console.log("Bot opérationnel");
});

async function save(){
    await ConfigSchema.findOneAndUpdate(
        {
            id: process.env.SERVER_ID
        },
        {
            leagues: leagues,
            driver_role: driver_role,
            admin_role: admin_role,
            teams: teams,
            recla_category: recla_category,
            recla_channel: recla_channel,
        },
        {
            upsert: true
        }
    )
}

client.on("messageCreate", message => {
    console.log('Nouveau message...');
    if(message.channel.id == recla_channel){
        if(message.content.startsWith(PREFIX)){
            if(message.member.roles.cache.has(driver_role)){
                message.delete();
                var end = message.content.split(PREFIX);
                var users = getUsers(end[1]);
                
                message.guild.channels.create("récla-de-" + message.author.username, {
                    type: 'text',
                    parent: recla_category,
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.everyone,
                            allow: [],
                            deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                        },
                        {
                            id: admin_role,
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
                    users.forEach(user => {
                        channel.permissionOverwrites.edit(user, {
                            VIEW_CHANNEL: true,
                            SEND_MESSAGES: true,
                            READ_MESSAGE_HISTORY: true
                           })
                    });
                    users.push(message.member.id);
                    var userLeague = getUserLeague(message);
                    console.log("Salon: " + channel.id);
                    createRecla(channel.id, message.member.id, userLeague.id, users);
                    
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
                            .setStyle('DANGER')
                    );
        
                    channel.send({ content: 'Voici le formulaire à renseigner:', components: [rowLeague, rowInstant, rowSubmit] });
                })
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }
    }else if(message.channel.id == process.env.CONFIG_CHANNEL){
        if( message.content.startsWith("!leagues")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                if(leagues && leagues.length > 0){
                    for(let i=0 ; i < leagues.length ; i++){
                        console.log("Ligue " + leagues[i]);
                        message.channel.send("Ligue " + leagues[i] + " <@&" + leagues[i] + ">")
                    }
                }else{
                    message.channel.send("Aucune ligue définie")
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if( message.content.startsWith("!teams")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                if(teams && teams.length > 0){
                    for(let i=0 ; i < teams.length ; i++){
                        console.log("Ecurie " + teams[i]);
                        message.channel.send("Ecurie " + teams[i] + "<@&" + teams[i] + ">")
                    }
                }else{
                    message.channel.send("Aucune écurie définie")
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
                    if(!leagues){
                        leagues = [];
                    }
                    if(!leagues.includes(role.id)){
                        leagues.push(role.id);
                        message.reply("La ligue " + role.name + " a été ajoutée");
                    }else{
                        message.reply("La ligue " + role.name + " existe déjà dans la configuration du bot");
                    }
                }
                save();
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "remove-league")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "remove-league");
                var roles = getRoles(message, end[1]);
                for(let i = 0 ; i< roles.length ; i++){
                    var role = roles[i];
                    if(leagues.includes(role.id)){
                        leagues.pop(role.id);
                        message.reply("L'écurie " + role.name + " a bien été supprimée");
                    }else{
                        message.reply("L'écurie " + role.name + " n'existe pas dans la configuration du bot, elle ne peut donc pas être supprimée!");
                    }
                }
                save();
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "add-team")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "add-team");
                var roles = getRoles(message, end[1]);
                for(let i = 0 ; i< roles.length ; i++){
                    var role = roles[i];
                    if(!teams.includes(role.id)){
                        teams.push(role.id);
                        message.reply("L'écurie " + role.name + " a été ajoutée");
                    }else{
                        message.reply("L'écurie " + role.name + " existe déjà dans la configuration du bot");
                    }
                }
                save();
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "remove-team")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "remove-team");
                var roles = getRoles(message, end[1]);
                for(let i = 0 ; i< roles.length ; i++){
                    var role = roles[i];
                    if(teams.includes(role.id)){
                        teams.pop(role.id);
                        message.reply("L'écurie " + role.name + " a bien été supprimée");
                    }else{
                        message.reply("L'écurie " + role.name + " n'existe pas dans la configuration du bot, elle ne peut donc pas être supprimée!");
                    }
                }
                save();
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "recla-channel")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "recla-channel");
                let channel = getChannel(message, end[1]);
                if(channel != undefined){
                    recla_channel = channel.id;
                    save();

                    message.reply("Salon " + channel.name + " défini comme salon des réclamations");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "recla-category")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                var end = message.content.split(CONFIG_PREFIX + "recla-category");
                if(end[1] != undefined){
                    recla_category = end[1].trim();
                    save();
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
                    admin_role = role.id;
                    save();

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
                    driver_role = role.id;
                    save();

                    message.reply("Role " + role.name + " défini comme rôle nécessaire pour voir et gérer les réclamations");
                }
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        // }else if(message.content.startsWith(CONFIG_PREFIX + "clear-reclas")){
        //     if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
        //         c.reclas = {};
        //         save();

        //         const category = message.guild.channels.cache.get(c.recla_category); // You can use `find` instead of `get` to fetch the category using a name: `find(cat => cat.name === 'test')
        //         category.children.forEach(channel => channel.delete())
        //     }else{
        //         message.reply("Vous n'avez pas les droits pour effectuer cette action");
        //     }
        }else if(message.content.startsWith(CONFIG_PREFIX + "clear-leagues")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                leagues = [];
                save();
                message.reply("Les ligues ont été réinitialisées");
            }else{
                message.reply("Vous n'avez pas les droits pour effectuer cette action");
            }
        }else if(message.content.startsWith(CONFIG_PREFIX + "clear-teams")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                teams = [];
                save();
                message.reply("Les écuries ont été réinitialisées");
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
        }else if(message.content.startsWith(CONFIG_PREFIX + "status")){
            if(message.member.roles.cache.has(process.env.CONFIG_ROLE)){
                message.channel.send("Listing des ligues:");
                for(let i=0 ; i < leagues.length ; i++){
                    console.log("Ligue " + leagues[i]);
                    message.channel.send("Ligue " + leagues[i] + " <@&" + leagues[i] + ">")
                }

                message.channel.send("Listing des écuries:");
                for(let i=0 ; i < teams.length ; i++){
                    console.log("Ligue " + teams[i]);
                    message.channel.send("Ligue " + teams[i] + " <@&" + teams[i] + ">")
                }

                message.channel.send("Salon des réclamations: <#" + recla_channel + ">");
                message.channel.send("Catégorie des réclamations: " + recla_category);
                message.channel.send("Role admin: <@" + admin_role + ">");
                message.channel.send("Role pilote: <@" + driver_role + ">");
                
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
            var recla = await ReclaSchema.findOne({messageId: channelId});
            var author = recla.author;
            if(author == interaction.member.id){
                var value = interaction.values[0];
                console.log("- - - - -: " + channelId);
                updateLeagueRecla(channelId, value);
            }else{
                interaction.message.reply("Vous ne pouvez pas réagir à une réclamation dont vous n'êtes pas l'auteur");
            }
            interaction.deferUpdate();
            return;
        }else if(interaction.customId == 'instant'){
            var channelId = interaction.channel.id;
            var recla = await ReclaSchema.findOne({messageId:channelId});
            var author = recla.author;
            if(author == interaction.member.id){
                var value = interaction.values[0];
                console.log("- - - - -: " + channelId);
                updateInstantRecla(channelId, value);
            }else{
                interaction.message.reply("Vous ne pouvez pas réagir à une réclamation dont vous n'êtes pas l'auteur");
            }
            interaction.deferUpdate();
            return;
        }
    }else if(interaction.isButton()){
        var channel = interaction.channel;
        var recla = await ReclaSchema.findOne({messageId: channel.id});
        var author = recla.author;
        if(author == interaction.member.id){
            author = getUser(author);
            var authorTeam = getUserTeam(interaction, author); 
            var teamName = "Inconnu";
            if(authorTeam != null){
                teamName = authorTeam.name;
            }

            var instant = recla.instant;
            var league = recla.league;

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

                var drivers = recla.drivers;
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
    leagueRoles = [];

    for(let i=0 ; i < leagues.length ; i++){
        let role = guild.roles.cache.find(x => x.id == leagues[i]);
        leagueRoles.push(role);
    }

    return leagueRoles;
}

function getLeague(guild, leagueId){

    for(let i=0 ; i < leagues.length ; i++){
        if(leagues[i] == leagueId){
            return guild.roles.cache.find(x => x.id == leagues[i]);
        }
    }

    return null;
}

function buildLeagueOptions(message){
    league_options = [];
    for(var i = 0 ; i < leagueRoles.length ; i++){
        var r ={
            label: leagueRoles[i].name,
            value: leagueRoles[i].id,
            default: message.member.roles.cache.has(leagueRoles[i].id)
        };
        league_options.push(r);
    }
}

function getUserLeague(message){
    for(var i = 0 ; i < leagues.length ; i++){
        if(message.member.roles.cache.has(leagues[i])){
            return message.guild.roles.cache.find(x => x.id == leagues[i]);
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
    for(var i = 0 ; i < teams.length ; i++){
        if(u.roles.cache.has(teams[i])){
            return u.roles.cache.find(x => x.id == teams[i]);
        }
    }
    return null;
}

async function createRecla(messageId, author, league, drivers){
    await ReclaSchema.findOneAndUpdate(
        {
            messageId: messageId
        },
        {
            author: author,
            league: league,
            drivers: drivers,
        },
        {
            upsert: true
        }
    )
}

async function updateLeagueRecla(messageId, league){
    await ReclaSchema.findOneAndUpdate(
        {
            messageId: messageId
        },
        {
            league: league,
        }
    )
}

async function updateInstantRecla(messageId, instant){
    await ReclaSchema.findOneAndUpdate(
        {
            messageId: messageId
        },
        {
            instant: instant,
        }
    )
}
client.login(process.env.DISCORD_TOKEN);