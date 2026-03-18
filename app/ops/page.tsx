"use client"

import FleetMap from "@/components/FleetMap"
import FleetActivity from "@/components/FleetActivity"

export default function OperationsPage(){

  return(

    <div style={{padding:24}}>

      <h1 style={{fontSize:28,fontWeight:700}}>
        Fleet Operations
      </h1>

      <p style={{opacity:.7}}>
        Monitor vehicle movement and operational status.
      </p>

      <div style={grid}>

        <FleetMap/>

        <FleetActivity/>

      </div>

    </div>

  )

}

const grid={
  marginTop:30,
  display:"grid",
  gridTemplateColumns:"2fr 1fr",
  gap:20
}