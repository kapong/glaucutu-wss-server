const { io } = require("socket.io-client");

const agentinfo = {
    name: "นพ.ทดสอบ พ.ก.",
    position: "จักษุแพทย์ - 1",
    affiliation: "รพ. XXXXXXXXXX",
    image: "img/sample/doctor.jpg",
}

const encoded = Buffer.from(JSON.stringify(agentinfo)).toString("base64");

console.log(encoded)

const socket = io("wss://wss.glaucutu.com/agent", {
    extraHeaders: {
        "glaucutu": process.argv[2] || "test",
        "agent": encoded,
    }
});

socket.on("join-room", (arg)=>{
    console.log("Join", arg);
})

socket.on("vrevent", (arg)=>{
    console.log(arg)
})

socket.on("client-disconnected", (arg)=>{
    console.log("client-disconnected")
})

socket.on("client-connected", (arg)=>{
    console.log("client-connected")
})

socket.emit("vrevent", ["hello", "xxx"]);