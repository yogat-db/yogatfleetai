"use client"

export default function HelpCenterPage() {

  return (

    <div style={page}>

      <h1 style={title}>Help Center</h1>

      <p style={subtitle}>
        Find guides, policies, and answers to common questions about Yogat Fleet AI.
      </p>


      {/* Getting Started /}

      <section style={section}>

        <h2 style={sectionTitle}>Getting Started</h2>

        <p>
          Yogat Fleet AI helps you manage vehicles, diagnose problems, and connect
          with mechanics in real-time through the Fleet Marketplace.
        </p>

        <ul style={list}>
          <li>Add vehicles to your fleet dashboard</li>
          <li>Run diagnostics to detect issues</li>
          <li>Request repairs from verified mechanics</li>
          <li>Track service history and maintenance</li>
        </ul>

      </section>


      {/ Fleet Marketplace /}

      <section style={section}>

        <h2 style={sectionTitle}>Fleet Marketplace</h2>

        <p>
          The marketplace allows garages and mobile mechanics to compete
          for repair jobs. When a repair request is submitted, mechanics
          can submit bids and estimated arrival times.
        </p>

        <ul style={list}>
          <li>Live mechanic bidding system</li>
          <li>Transparent repair pricing</li>
          <li>Real-time availability</li>
          <li>Verified garage profiles</li>
        </ul>

      </section>


      {/ Diagnostics /}

      <section style={section}>

        <h2 style={sectionTitle}>Vehicle Diagnostics</h2>

        <p>
          Diagnostics scans your vehicles to identify potential mechanical
          issues before they become serious problems.
        </p>

        <ul style={list}>
          <li>OBD fault code detection</li>
          <li>Predictive maintenance alerts</li>
          <li>Repair cost estimates</li>
          <li>Vehicle health monitoring</li>
        </ul>

      </section>


      {/ Security /}

      <section style={section}>

        <h2 style={sectionTitle}>Security & Identity Verification</h2>

        <p>
          For safety and fraud prevention, users may verify their identity
          through the Settings page.
        </p>

        <ul style={list}>
          <li>Passport</li>
          <li>Driving Licence</li>
          <li>National ID</li>
          <li>Residence Permit</li>
          <li>Company Registration</li>
        </ul>

      </section>


      {/ Policies /}

      <section style={section}>

        <h2 style={sectionTitle}>Policies & Regulations</h2>

        <p>
          Yogat Fleet AI follows strict safety and compliance standards
          to ensure reliability for fleet operators and repair providers.
        </p>

        <ul style={list}>
          <li>Terms of Service</li>
          <li>Privacy Policy</li>
          <li>Marketplace Guidelines</li>
          <li>Service Provider Requirements</li>
        </ul>

      </section>


      {/ Contact Support */}

      <section style={section}>

        <h2 style={sectionTitle}>Need More Help?</h2>

        <p>
          If you cannot find the answer you need, our support team
          is available to assist you.
        </p>

        <a href="/service/support" style={supportButton}>
          Contact Customer Support
        </a>

      </section>

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
  marginBottom:40
}

const section:any = {
  marginBottom:40,
  borderBottom:"1px solid #1e293b",
  paddingBottom:30
}

const sectionTitle:any = {
  fontSize:20,
  marginBottom:10
}

const list:any = {
  marginTop:10,
  paddingLeft:20,
  lineHeight:1.8
}

const supportButton:any = {
  display:"inline-block",
  marginTop:15,
  padding:"12px 18px",
  background:"#22c55e",
  borderRadius:8,
  color:"#000",
  fontWeight:600,
  textDecoration:"none"
}