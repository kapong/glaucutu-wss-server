const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const tmp = require('tmp');
const fs = require('fs');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    endpoint: process.env.MINIO_ENDPOINT, // Use your MinIO server's endpoint
    accessKeyId: process.env.MINIO_KEYID, // Default MinIO access key (change as needed)
    secretAccessKey: process.env.MINIO_SECRET, // Default MinIO secret key (change as needed)
    s3ForcePathStyle: true, // Needed with MinIO
    signatureVersion: 'v4'
  });

server_option = {
    cors: {
        allowedHeaders: ["glaucutu", "agent"],
    },
}

const io = new Server(server, server_option);

function randomRoomNumber(){
    return String(Math.round(Math.random() * 1e6) % 1e6).padStart(6, '0');
}

clientio = io.of('/client')
agentio = io.of('/agent')
webrtcio = io.of('/webrtc')

clientio.on("connection", (socket)=>{
    const { glaucutu } = socket.handshake.headers
    let room = (glaucutu != '')?glaucutu:randomRoomNumber();
    
    while(clientio.adapter.rooms.has(room)){
        room = randomRoomNumber()
    }

    // create temporary file
    const tmpobj = tmp.fileSync();
    console.log('File: ', tmpobj.name);

    socket.join(room)

    // write append socket unique id and current timestamp to temporary file
    fs.appendFileSync(tmpobj.name, `${socket.id}\nopened ${Date.now()}`)

    socket.emit("join-room", room);
    agentio.to(room).emit("client-connected")

    socket.on("vrevent", (arg)=>{
        // write Jsonify of arg to temporary file
        fs.appendFileSync(tmpobj.name, "vrevent")
        fs.appendFileSync(tmpobj.name, JSON.stringify(arg))
        agentio.to(room).emit("vrevent", arg)
    })
    
    socket.on("webrtcevent", (arg)=>{
        fs.appendFileSync(tmpobj.name, "webrtcevent")
        fs.appendFileSync(tmpobj.name, JSON.stringify(arg))
        agentio.to(room).emit("webrtcevent", arg)
    })

    socket.on("disconnect", (arg)=>{
        agentio.to(room).emit("client-disconnected", arg)
        fs.appendFileSync(tmpobj.name, `closed ${Date.now()}`)
        const fileContent = fs.readFileSync(tmpobj.name);
        // filename from room, socket.id and timestamp
        const filename = `${room}-${socket.id}-${Date.now()}.txt`

        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
            Body: fileContent
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error(err);
            } else {
                console.log('File uploaded to S3:', data.Location);
            }
        });
        
        tmpobj.removeCallback()
    })
});

webrtcio.on("connection", (socket)=>{
    const { glaucutu } = socket.handshake.headers
    
    socket.join(glaucutu)
    socket.emit("join-room", glaucutu);
    socket.to(glaucutu).emit("client-connected")

    socket.on("webrtcevent", (arg)=>{
        socket.to(glaucutu).emit("webrtcevent", arg)
    })
    socket.on("disconnect", (arg)=>{
        socket.to(glaucutu).emit("client-disconnected", arg)
    })
});

agentio.on("connection", (socket)=>{
    const { glaucutu, agent } = socket.handshake.headers
    console.log(socket.handshake.headers)
    if (!clientio.adapter.rooms.has(glaucutu)) {
        socket.emit("error", {
            status: "Room not found",
            code: 404,
        })
        socket.disconnect()
        return
    }
    socket.join(glaucutu)
    clientio.to(glaucutu).emit("agent-connected", agent)
    socket.emit("join-room", glaucutu);
    
    socket.on("howdy", (arg)=>{
        console.log(arg);
    })

    socket.on("vrevent", (arg)=>{
        clientio.to(glaucutu).emit("vrevent", arg)
    })
    
    socket.on("webrtcevent", (arg)=>{
        clientio.to(glaucutu).emit("webrtcevent", arg)
    })

    socket.on("disconnect", (arg)=>{
        clientio.to(glaucutu).emit("agent-disconnected", agent)
    })
});

io.of("/").on("connection", (socket) => {
    socket.disconnect()
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})
  
app.get('/healthcheck', (req, res) => {
    res.send({status: true})
})

app.get('/rooms', (req, res) => {
    const rooms = Object.fromEntries(
        clientio.adapter.rooms
    )
    res.send({rooms: rooms})
})

server.listen(3000, ()=>{
    console.log("listening on *:3000");
})