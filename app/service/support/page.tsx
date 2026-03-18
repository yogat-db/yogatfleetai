"use client"

import { useState } from "react"

type Message = {
  sender: "user" | "ai"
  text: string
}

export default function SupportPage() {

  const [input,setInput] = useState("")
  const [messages,setMessages] = useState<Message[]>([
    {
      sender:"ai",
      text:"Hello 👋 I’m the Yogat Fleet AI assistant. How can I help you today?"
    }
  ])

  function sendMessage(){

    if(!input.trim()) return

    const userMessage:Message = {
      sender:"user",
      text:input
    }

    const updated = [...messages,userMessage]

    setMessages(updated)
    setInput("")

    setTimeout(()=>{

      const aiReply = generateAIReply(input)

      setMessages(prev => [
        ...prev,
        { sender:"ai", text:aiReply }
      ])

    },600)

  }

  function generateAIReply(question:string){

    const q = question.toLowerCase()

    if(q.includes("fault") || q.includes("code")){

      return "It looks like you're asking about a vehicle fault code. You can run diagnostics from the Diagnostics page to identify issues and estimate repair costs."

    }

    if(q.includes("repair") || q.includes("mechanic")){

      return "To request a repair, go to the Marketplace page and submit a repair request. Nearby garages will bid for the job."

    }

    if(q.includes("vehicle")){

      return "You can manage vehicles from the Fleet page where you can add vehicles, track service history, and monitor vehicle health."

    }

    if(q.includes("account") || q.includes("password")){

      return "Account settings and password reset options are available in the Settings page."

    }

    return "Thanks for your message. If you need further assistance our support team will review your request."
  }

  return (

    <div style={page}>

      <h1 style={title}>Customer Support</h1>

      <p style={subtitle}>
        Chat with our AI assistant or contact support for help with Yogat Fleet AI.
      </p>

      {/* Chat Window /}

      <div style={chatBox}>

        {messages.map((msg,i)=>(

          <div
            key={i}
            style={{
              ...message,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              background: msg.sender === "user" ? "#16a34a" : "#0f172a"
            }}
          >

            {msg.text}

          </div>

        ))}

      </div>


      {/ Message Input /}

      <div style={inputArea}>

        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Ask a question..."
          style={inputStyle}
        />

        <button
          onClick={sendMessage}
          style={sendButton}
        >
          Send
        </button>

      </div>


      {/ Extra Support Options */}

      <div style={extraSection}>

        <h3>Other Support Options</h3>

        <ul style={list}>

          <li>Submit a support ticket</li>
          <li>View Help Center guides</li>
          <li>Check diagnostics troubleshooting</li>

        </ul>

      </div>

    </div>

  )

}


const page:any = {
  padding:40,
  maxWidth:900,
  margin:"0 auto"
}

const title:any = {
  fontSize:32,
  marginBottom:10
}

const subtitle:any = {
  opacity:0.7,
  marginBottom:30
}

const chatBox:any = {
  border:"1px solid #1e293b",
  borderRadius:12,
  padding:20,
  minHeight:350,
  display:"flex",
  flexDirection:"column",
  gap:12,
  background:"#020617"
}

const message:any = {
  padding:"10px 14px",
  borderRadius:10,
  maxWidth:"70%"
}

const inputArea:any = {
  display:"flex",
  gap:10,
  marginTop:20
}

const inputStyle:any = {
  flex:1,
  padding:12,
  borderRadius:10,
  border:"1px solid #1e293b",
  background:"#020617",
  color:"white"
}

const sendButton:any = {
  padding:"12px 18px",
  borderRadius:10,
  border:"none",
  background:"#22c55e",
  color:"#000",
  fontWeight:600,
  cursor:"pointer"
}

const extraSection:any = {
  marginTop:40,
  borderTop:"1px solid #1e293b",
  paddingTop:20
}

const list:any = {
  marginTop:10,
  paddingLeft:20,
  lineHeight:1.8
}