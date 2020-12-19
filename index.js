const http=require('http');
const express=require('express');
var app=express();
app.get("/creategame",(req,res)=>res.sendFile(__dirname+"/creategame.html"));
app.get("/joingame",(req,res)=>res.sendFile(__dirname+"/joingame.html"));
app.get("/drawboard",(req,res)=>res.sendFile(__dirname+"/drawboard.html"));
app.use(express.static('public'));
app.listen(9091,()=>console.log('Express Server Listening on port 9091'));
const websocketServer=require('websocket').server;
const httpServer=http.createServer();
const uuid=require('uuid')
httpServer.listen(9090,()=>console.log('http server(WS) Listening on 9090'));

const clients={};
const games={};
const drawboards={};
const WsServer=new websocketServer({
    //making our http server a WS server
    "httpServer":httpServer
});

//express server sends a request
WsServer.on("request",request=>{
    const connection=request.accept(null,request.origin);
    connection.on("close",()=>console.log("closed connection with clientId: "+clientId));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);

        //a user want to create a new game
        if (result.method === "create") {
            console.log("method:create")
            const clientId = result.clientId;
            //generate a new gameId using uuid
            const gameId = uuid.v4();

            games[gameId] = {
                "id": gameId,
                "tokenscolorarray":result.tokenscolorarray,
                "tokensnoarray":result.tokensnoarray,
                "noofDice":result.noofDice,
                "boardImage":result.boardImage,
                "tokenPositions": [],
                "clients": []
            }

            const payLoad = {
                "method": "create",
                "game" : games[gameId]
            }

            const con = clients[clientId].connection;
            console.log("PayLoad: "+JSON.stringify(payLoad));
            con.send(JSON.stringify(payLoad));
        }

        if(result.method==="newDrawboard"){
            const clientId=result.clientId;
            const drawboardId=uuid.v4();

            drawboards[drawboardId]={
                "id":drawboardId,
                "clients":[]
            }
            const payLoad={
                "method":"newDrawboard",
                "drawboard":drawboards[drawboardId]
            }
            const con = clients[clientId].connection;
            console.log("PayLoad: "+JSON.stringify(payLoad));
            con.send(JSON.stringify(payLoad));
        }

        if(result.method==="joinDrawboard"){
            const clientId=result.clientId;
            const drawboardId = result.drawboardId;
            console.log(drawboardId);
            const drawboard = drawboards[drawboardId];
            console.log(drawboard);
            const color =  {"0": "red", "1": "blue","2":"green","3":"orange" }[drawboard.clients.length]
            drawboard.clients.push({
                "clientId": clientId,
                "color": color
            })
            const payLoad = {
                "method": "joinDrawboard",
                "drawboard": drawboard
            }
            console.log("PayLoad: "+JSON.stringify(payLoad));
            //loop through all clients and tell them that people has joined
            drawboard.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

        //a client want to join
        if (result.method === "join") {

            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

        const color =  {"0": game.tokenscolorarray[0], "1": game.tokenscolorarray[1]}[game.clients.length]
            game.clients.push({
                "clientId": clientId,
                "color": color
            })
           
            const payLoad = {
                "method": "join",
                "game": game
            }
            console.log("PayLoad: "+JSON.stringify(payLoad));
            //loop through all clients and tell them that people has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }
        //a user moves token 
        if(result.method==="updatepos"){
            const  gameId=result.gameId;
            const clientId=result.clientId;
            const xpos=result.xpos;
            const ypos=result.ypos;
            const activetokenId=result.activetokenId
            const payLoad={
                "method":"updatepos",
                "xpos":xpos,
                "ypos":ypos,
                "clientId":clientId,
                "activetokenId":activetokenId
            }
            games[gameId].clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })

        }
        //a user rolled dice
        if(result.method==="updatedice"){
            const diceId=result.diceId;
            const value=result.value;
            const gameId=result.gameId;
            const clientId=result.clientId;
            const payLoad={
                "method":"updatedice",
                "diceId":diceId,
                "value":value,
                "clientId":clientId
            }
            games[gameId].clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })

            
        }

        if(result.method==="chat"){
            const  gameId=result.gameId;
            const clientId=result.clientId;
            const chattext=result.chattext;
            const color=result.color;
            const payLoad = {
                "method": "chat",
                "chattext":chattext,
                "clientId":clientId,
                "color":color
            }
            console.log("PayLoad: "+JSON.stringify(payLoad));
            //loop through all clients and tell them that people has joined
            games[gameId].clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

    })

    //generate a new clientId
    const clientId = uuid.v4();
    clients[clientId] = {
        "connection":  connection
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    //send back the client connect
    console.log("PayLoad: "+JSON.stringify(payLoad));
    connection.send(JSON.stringify(payLoad))

})