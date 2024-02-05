const { io } = require("socket.io-client");

const socket = io("ws://localhost:3000/client", {
    extraHeaders: {
        "glaucutu": process.argv[2] || '',
    }
});

socket.on("join-room", (arg)=>{
    console.log("Join Room: ", arg);
    socket.io.opts.extraHeaders['glaucutu'] = arg
})

socket.on("agent-connected", (agent) => {
    console.log("agent connect", agent)
    
    socket.emit("vrevent", "start");
})


socket.on("agent-disconnected", (agent) => {
    console.log("agent disconnect", agent)
})

socket.on("error", arg=>{
    console.log(argv)
})

socket.emit("howdy", "stranger");