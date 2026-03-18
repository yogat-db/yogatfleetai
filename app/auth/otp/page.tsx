"use client"

import { useState } from "react"

export default function OtpLogin(){

 const [phone,setPhone] = useState("")
 const [otp,setOtp] = useState("")

 async function sendOTP(){

  await fetch("/api/auth/otp",{
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify({phone})
  })

  alert("OTP sent")

 }

 async function verifyOTP(){

  const res = await fetch("/api/auth/otp",{
   method:"PUT",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify({phone,otp})
  })

  if(res.ok)
   window.location.href="/dashboard"

 }

 return (

  <div style={{padding:40,maxWidth:420}}>

   <h1>Phone Login</h1>

   <input
    placeholder="Phone number"
    value={phone}
    onChange={e=>setPhone(e.target.value)}
   />

   <button onClick={sendOTP}>Send OTP</button>

   <input
    placeholder="Enter OTP"
    value={otp}
    onChange={e=>setOtp(e.target.value)}
   />

   <button onClick={verifyOTP}>
    Verify
   </button>

  </div>

 )

}