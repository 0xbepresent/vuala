/*
*The operation of the class is to generate a random conversation with users *connected to the XMPP server. The message handling is done with XMPP, *randomly generates a username and password for the XMPP server and the same *data are used to connect to the server.
*XMPP need XEP
*/

/*Version number*/
var VualaVersion = "1.0.0";

/*Configuration*/
var defaultDomain = 'jabbermisalabs.com';
var defaultConferenceServer = 'conference.jabbermisalabs.com';
var defaultBOSH = 'http://jabbermisalabs.com:5280/xmpp-httpbind';
var roomChat = "vuala";
var NS_MUC = "http://jabber.org/protocol/muc";

/*Initialization*/
var loginCredentials = new Array();
var Vuala = {
    registrationConnection: null,
    connection: null, 
    room: null,
    nickname: null,    
    joined: null,
    participants: null,
    usersArray: new Array(),
    fanfeando: null,
    media_url:  'rtmfp://stratus.rtmfp.net/d1e1e5b3f17e90eb35d244fd-c711881365d9/',
    nearID: null,
    farID: null,
    on_presence: function(presence){
        var from = $(presence).attr("from");
        var room = Strophe.getBareJidFromJid(from);
        //Make sure this presence is for the right room
        if(room === Vuala.room){
            var nick = Strophe.getResourceFromJid(from);
            if($(presence).attr("type") === "error" && !Vuala.joined){
                //Error joining room; reset connection
                logoutXMPP();
            }else if(!Vuala.participants[nick] && 
                $(presence).attr("type") !== "unavailable"){
                Vuala.participants[nick] = true;
                //Add my nick
                add_list_users(nick);                
            }else if(Vuala.participants[nick] && 
                    $(presence).attr("type") === "unavailable"){
                //Remove from participants list
                $("#participant-list li").each(function(){
                   if(nick === $(this).text()){
                        $(this).remove();
                        Vuala.participants[nick] = null;
                        return false;
                   }
                });
                user_left(nick);
                remove_list_users(nick);
                getFlashMovie('video2').setProperty('src', null);
            }
            if($(presence).attr("type") !== "error" && !Vuala.joined){
                //Check for status 110 to see if its our own presence
                if($(presence).find("status[code='110']").length > 0){
                    //Check if server changed our nick
                    if($(presence).find("status[code='210']").length > 0){
                        Vuala.nickname = Strophe.getResourceFromJid(from);
                    }
                    //Display Room join complete 
                    room_joined();
                }
            }
        }
        return true;
    },
    add_message: function(msg){
        //Detect if we are scrolled all the way down
        var chat = $("#chat").get(0);
        var at_bottom = chat.scrollTop >= chat.scrollHeight - 
            chat.clientHeight;
        $("#chat").append(msg);
        //If we were at the bottom, keep us at the bottom
        if(at_bottom){
            chat.scrollTop = chat.scrollHeight;
        }
    },
    on_private_message: function(message){
        var from = $(message).attr('from');
        var room = Strophe.getBareJidFromJid(from);
        var nick = Strophe.getResourceFromJid(from);
        //Make sure this message is from the correct room
        if(room === Vuala.room){
            var body = $(message).children("body").text();
            Vuala.add_message("<div class='message private'>" +
                                "<span class='nick'>" +
                                nick + "</span><span class='body'> " +
                                body + "</span></div>");
        }
        return true;
    },
    change_next_id: function(message){
        //Asign val fanfeando
        if(Vuala.fanfeando === "-" || Vuala.fanfeando === null){
            var from = $(message).attr('from');
            var nick = Strophe.getResourceFromJid(from);
            Vuala.farID = $(message).find("userjabber").text();
            Vuala.fanfeando = nick;
            setVideo();
            Vuala.add_message("<div class='message private'>"+
                                "<span class='body'> Chat with "+
                                nick+"</span");
            var to = nick;
            var local_nearID = Vuala.nearID;
            change_local_fanfeando(to, local_nearID);
        }
        // else{
        //     Vuala.add_message("<div class='message private'><span class='body'> Asing imposible </span");
        // }
        return true;
    },
    change_local_id: function(message){
        var from = $(message).attr('from');
        var nick = Strophe.getResourceFromJid(from);
        Vuala.fanfeando = nick;
        Vuala.farID = $(message).find("userjabber").text();
        setVideo();
        Vuala.add_message("<div class='message private'>"+
                                "<span class='body'> Chat with "+
                                nick+"</span");
        return true;
    },
    delete_next_id: function(message){
        //Check if is available
        Vuala.fanfeando = "-";
        Vuala.farID = "-";
        getFlashMovie('video2').setProperty('src', null);
        //Vuala.add_message("<div class='message private'><span class='body'> Delete myID</span");
        return true;
    }
};

$(document).ready(function(){
    $("#version").text(VualaVersion);
    //Login Dialog
    $("#submit_login").click(function(){
        Vuala.room = roomChat+"@"+defaultConferenceServer;
        //Vuala.nickname = $("#nickname").val();
        $("#nick").text($("#nickname").val());
        //Register new User and Password on XMPP
        loginCredentials[0] = generateStringRandom();
        loginCredentials[1] = generateStringRandom();
        //Vuala.nickname = loginCredentials[0];
        Vuala.nickname = $("#nickname").val();
        registerUserXMPP(loginCredentials[0], loginCredentials[1]);
        //Login to XMPP
        loginUserXMPP(loginCredentials[0], loginCredentials[1]);
    });
   
   $("#input").keypress(function(ev){
     if(ev.which === 13){
        ev.preventDefault();
        var body = $(this).val();
        if(Vuala.participants[Vuala.fanfeando]){
            Vuala.connection.send(
            $msg({
                to: Vuala.room+"/"+Vuala.fanfeando,
                type: "chat"}).c("body").t(body));
                Vuala.add_message(
                        "<div class='message private'>"+
                        "<span class='nick self'>"+
                        Vuala.nickname+
                        "</span> <span class='body'>"+
                        body+"</span></div>");
        }else{
            Vuala.add_message(
            "<div class='notice error'>Error: Not asigned" +
            "</div>");
        }
        $(this).val(null);
     }
   });
   
   $("#nextId").click(function(){
        //Delete My id 
        delete_id_fanfeando();
        //Rulet
        next_id();
   });
   
   //Logout on click button
   $("#leave").click(function(){
        Vuala.usersArray = new Array();
        Vuala.fanfeando = null;
        getFlashMovie('video1').setProperty('src', null);
        logoutXMPP();
   });
   
   // Logout on browser close
    $(document).unload(function() {
        getFlashMovie('video1').setProperty('src', null);
        logoutXMPP();
    });
});

/*
*Functions help to Connection Strophe
*/
//Register a new user on the XMPP Server
function registerUserXMPP(username, password){
    var registrationConnection = new Strophe.Connection(defaultBOSH);
    registrationConnection.register.connect(
        defaultDomain, function(status) {
        if (status === Strophe.Status.REGISTER) {
            registrationConnection.register.fields.username = username;
            registrationConnection.register.fields.password = password;
            registrationConnection.register.submit();
        }
        else if (status === Strophe.Status.REGISTERED) {
            registrationConnection.disconnect();
            delete registrationConnection;
            return true;
        }
        else if (status === Strophe.Status.SBMTFAIL) {
            return false;
        }
    });
}

//Login into XMPP Server
function loginUserXMPP(username, password){
   Vuala.connection = new Strophe.Connection(defaultBOSH);
   Vuala.connection.connect(
        username+"@"+defaultDomain, password,
        function(status){
            if(status == Strophe.Status.CONNECTED){
                connected();
                return true;
            }else if(status === Strophe.Status.DISCONNECTED){
                disconnected();
                return false;
            }
    });
}

function logoutXMPP(){
    Vuala.connection.send($pres({to: Vuala.room+"/"+Vuala.nickname,
                            type: "unavailable"}));
    Vuala.connection.disconnect();
    //Delete id_oposit
    delete_id_fanfeando();
    //Display disconnected
    disconnected();
    window.location.reload(true);
    return true;
}

function connected(){
    //Show areas
    $("#login_dialog").css("display", "none");
    $("#wrapper").css("display", "block");
    Vuala.joined = false;
    Vuala.participants = {};
    Vuala.connection.send($pres().c("priority").t("-1"));
    initHandlers();
    Vuala.connection.send($pres({
        to: Vuala.room+"/"+Vuala.nickname
    }).c("x", {xmlns: NS_MUC}));
    return true;
}

function initHandlers(){
    //Handler presence
    Vuala.connection.addHandler(Vuala.on_presence, null, "presence");
    //Handler private message
    Vuala.connection.addHandler(Vuala.on_private_message, 
                                    null, "message", "chat");
    //Handler change next_id
    Vuala.connection.addHandler(Vuala.change_next_id, 
                                    null,"message", "change_id");
    //Handler change next_id
    Vuala.connection.addHandler(Vuala.change_local_id, 
                                    null,"message", "change_local_id");
    //Handler delete next id
    Vuala.connection.addHandler(Vuala.delete_next_id, 
                                    null,"message", "delete_id");
    return true;
}

/*
*Functions help to display
*/
//Display disconnected
function disconnected(){
    $("#participant-list").empty();
    $("#chat").empty();
    $("#wrapper").css("display", "none");
    $("#login_dialog").css("display", "block");
    return true;
}

//Display room joined
function room_joined(){
    Vuala.joined = true;
    $('#leave').removeAttr('disabled');
    Vuala.add_message("<div class='notice'>**** Room joined.</div>");
    return true;
}

//Display user left
function user_left(nick){
    Vuala.add_message("<div class='notice'>*** "+nick+" left.</div>");
    return true;
}

//Add var list of users
function add_list_users(nick){
    //Vuala.add_message("<div class='notice'>*** Add user "+nick+"</div>");
    Vuala.usersArray[Vuala.usersArray.length] = nick;
    users_online(Vuala.usersArray.length);
    return true;
}

//Remove list from array.
function remove_list_users(nick){
   var lengthArr = Vuala.usersArray.length;
   for(var i=0; i<lengthArr; i++) {
        if(Vuala.usersArray[i] == nick) {
            Vuala.add_message("<div class='notice'>*** Remove user "+nick+"</div>");
            Vuala.usersArray.splice(i, 1);
            break;
        }
    }
    users_online(Vuala.usersArray.length);
    return true;
}

function users_online(num){
    $("#num_users_online").text(num);
    return true;
}

/*
*Functions help to connect To Vuala
*/
function next_id(){
    //Find in people with Vuala.fanfeando = null
     if(Vuala.usersArray.length>1){
         do{
            var maxList = Vuala.usersArray.length;
            var rnd = Math.floor((Math.random()*maxList)+0);
            var nextID = Vuala.usersArray[rnd];
         }while(Vuala.nickname == nextID);
         
        //Send and check available
        Vuala.connection.send(
            $msg({
                to: Vuala.room+"/"+nextID,
                type: "change_id"
        }).c("userjabber").t(Vuala.nearID));
     }
     return true;
}

//If new id user is available update Local fanfeando
function change_local_fanfeando(data, local_nearID){
    Vuala.connection.send(
            $msg({
                to: Vuala.room+"/"+data,
                type: "change_local_id"
            }).c("userjabber").t(local_nearID));
    return true;
}

//Quit id fanfeando of user
function delete_id_fanfeando(){
    if(Vuala.fanfeando != null){
            //Quit fanfeando ID of other person
            Vuala.connection.send(
                $msg({
                    to: Vuala.room+"/"+Vuala.fanfeando,
                    type: "delete_id"
                }).c("body").t("Delete id_next"));
    }
    return true;
}

/*
*Functions several
*/
//Algorithm for number to person of chat
function generateRND(max){
    var rnd = Math.floor((Math.random()*max)+0);
    return rnd;
}

//Generate a String, for de User an Password to ejabberd
function generateStringRandom(){
    var m="";
    for(i=0;i<10;i++){
        m+=String.fromCharCode(Math.random()*25+0x41);
    }
    return m
}

//Public a video
function getFlashMovie(movieName) {
    var isIE = navigator.appName.indexOf("Microsoft") != -1;
    return (isIE) ? window[movieName] : document[movieName];
}

//Create video
function onCreationComplete(event) {
    if (event.objectID == "video1") {
        var url = Vuala.media_url + "?publish=" + Vuala.nickname;
          getFlashMovie("video1").setProperty("src", url);
    }
    return true; 
}

//Set Vuala.nearID
function onPropertyChange(event) {
    if (event.property == "nearID") {
      if (event.objectID == "video1") {
        Vuala.nearID = event.newValue;
      }
    }
    return true;
}

//Set video2
function setVideo(loginCredentials){
    var param =  Vuala.media_url+'?play='+Vuala.fanfeando+'&farID='+Vuala.farID;
    getFlashMovie('video2').setProperty('src', param);
    return true;
}