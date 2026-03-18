"use client"

export default function ServiceReminders(){

  const reminders=[
    {
      vehicle:"AB12CDE",
      service:"Brake inspection",
      due:"1200 miles"
    },
    {
      vehicle:"YX67KLP",
      service:"Oil change",
      due:"800 miles"
    }
  ]

  return(

    <div style={card}>

      <h3>Upcoming Service</h3>

      {reminders.map((r,i)=>(
        <div key={i} style={row}>

          <strong>{r.vehicle}</strong>

          <span>{r.service}</span>

          <span style={{opacity:.7}}>
            {r.due}
          </span>

        </div>
      ))}

    </div>

  )

}

const card={
  padding:20,
  borderRadius:12,
  border:"1px solid #1e293b",
  background:"#020617"
}

const row={
  display:"flex",
  justifyContent:"space-between",
  padding:"8px 0",
  borderBottom:"1px solid #1e293b"
}