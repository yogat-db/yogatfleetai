"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Vehicle = {
  id: string
  plate?: string
  make?: string
  model?: string
  year?: number
  mileage?: number
}

export default function DiagnosticsPanel(){

  const [vehicles,setVehicles] = useState<Vehicle[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    loadVehicles()
  },[])

  async function loadVehicles(){

    const { data,error } = await supabase
      .from("vehicles")
      .select("*")

    if(!error){
      setVehicles(data || [])
    }

    setLoading(false)

  }

  function analyzeVehicle(vehicle:Vehicle){

    const issues:string[] = []

    if((vehicle.mileage ?? 0) > 120000){
      issues.push("High mileage — service recommended")
    }

    if((vehicle.year ?? 0) < 2014){
      issues.push("Vehicle age risk — inspection recommended")
    }

    if((vehicle.mileage ?? 0) > 180000){
      issues.push("Critical mileage risk")
    }

    return issues

  }

  if(loading){
    return(
      <div className="enterprise-card" style={{padding:20}}>
        Loading diagnostics...
      </div>
    )
  }

  return(

    <div style={{display:"grid",gap:20}}>

      <div className="enterprise-card" style={{padding:20}}>
        <h2>Fleet Diagnostics</h2>
        <p style={{opacity:.7}}>
          AI-powered fleet health monitoring
        </p>
      </div>

      {vehicles.length === 0 && (
        <div className="enterprise-card" style={{padding:20}}>
          No vehicles found
        </div>
      )}

      {vehicles.map(vehicle=>{

        const issues = analyzeVehicle(vehicle)

        return(

          <div
            key={vehicle.id}
            className="enterprise-card"
            style={{
              padding:20,
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center"
            }}
          >

            <div>

              <div style={{fontWeight:700,fontSize:18}}>
                {vehicle.plate}
              </div>

              <div style={{opacity:.7}}>
                {vehicle.make} {vehicle.model} {vehicle.year}
              </div>

              <div style={{marginTop:6,fontSize:13}}>
                Mileage: {vehicle.mileage?.toLocaleString() ?? "—"}
              </div>

            </div>

            <div>

              {issues.length === 0 && (
                <div
                  style={{
                    color:"#22c55e",
                    fontWeight:600
                  }}
                >
                  Healthy
                </div>
              )}

              {issues.map((issue,i)=>(
                <div
                  key={i}
                  style={{
                    color:"#f87171",
                    fontSize:13
                  }}
                >
                  ⚠ {issue}
                </div>
              ))}

            </div>

          </div>

        )

      })}

    </div>

  )

}