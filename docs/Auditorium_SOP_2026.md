# Institutional Standard Operating Procedure (SOP) 2026
## Campus Auditorium Operations, Technical Workshops & IT Services

- **Document Reference**: `SOP-AUD-IT-2026-V2`
- **Effective Dates**: January 1, 2026 – December 31, 2026
- **Governing Bodies**: Office of Dean of Student Affairs (DoSA), Campus IT Infrastructure & Network Services, Electrical Maintenance Division (EMD), Campus Safety & Disaster Management Committee
- **Target Audience**: Student Club Executives, Event Organizers, Technical Committee Leads, Faculty Mentors

---

## 1. Purpose & Scope
This Standard Operating Procedure (SOP) governs all technical workshops, hackathons, seminars, stage productions, and co-curricular operations conducted inside the Main Campus Auditorium, AV control suites, and backstage technical zones. Additionally, it details mandatory procedures for reserving dedicated campus Wi-Fi hotspots and high-density network infrastructure for event participants.

---

## 2. Permissions Needed for Auditorium Technical Workshops

To organize and execute a technical workshop (e.g., coding bootcamps, hardware prototyping, robotics demonstrations, AV production masterclasses) in the Campus Auditorium, student clubs and organizers must secure **five (5) mandatory permissions and clearances**:

### A. Primary Administrative Clearance (DoSA / Campus Registrar)
- **Form Required**: Form `AUD-REQ-01` (Auditorium Facility Booking Application).
- **Lead Time**: Minimum **14 business days** prior to the proposed workshop date.
- **Endorsements**: Written endorsement and signature of the Club Faculty Advisor and authorized Club President.
- **Verification**: Confirms academic calendar compliance and ensures no scheduling conflicts with university events.

### B. Technical & Audio-Visual (AV) Division Clearance
- **Form Required**: Form `AUD-TECH-R2` (Technical Rider & AV Equipment Requisition).
- **Lead Time**: Minimum **7 business days** prior to the workshop.
- **Scope & Protocol**:
  - Detailed list of required equipment: stage audio consoles (Behringer X32/Wing), line-array microphones, HDMI/SDI video switchers, 4K laser projection systems, and motorized lighting rigs.
  - Access to the AV Control Booth is restricted to authorized technicians or certified student operators who have undergone the mandatory pre-briefing with the Chief AV Engineer.
  - A mandatory technical soundcheck and projection test must be scheduled at least 24 hours before the event.

### C. Electrical Maintenance Division (EMD) High-Load Clearance
- **Threshold**: Mandatory if total auxiliary electrical draw exceeds **3.5 kW** (e.g., high-performance compute clusters, robotics arenas, multiple soldering stations, 3D printer farms, high-intensity stage strobes, or fog/haze machines).
- **Inspection**: EMD engineers inspect temporary power distribution units (PDUs), circuit breaker ratings, and cable protection ramps, granting a signed **3-Phase Power Safety Seal**.

### D. Fire & Safety Committee Clearance (Disaster Management Cell)
- **Conditions**: Required when workshops utilize heat guns, soldering irons, chemical resins, aerial drone flight tests, or theatrical atmospheric effects (haze/fog).
- **Requirements**:
  - Two designated, active CO₂ and ABC dry chemical fire extinguishers stationed at the stage wings.
  - Two safety-trained student marshals on duty throughout the workshop duration.

### E. Campus Security & Guest Gate Pass Approvals
- **External Mentors & Speakers**: Guest speaker vehicle entry, visitor badges, and external equipment entry passes must be submitted to the Campus Security Office at least **3 business days** prior to the event.
- **Extended Hours Access**: Setup or teardown beyond 8:00 PM or overnight workshop sessions require a special **Extended Hours Permit** counter-signed by DoSA and the Chief of Security.

---

## 3. Campus Wi-Fi Hotspot & Event Network Reservation Procedures

For workshops, hackathons, and symposiums requiring high-density wireless connectivity, guaranteed bandwidth, or custom network ports, clubs must complete the following 4-step procedure:

### Step 1: Submit Reservation Ticket via ClubOps Portal
- **Eligibility**: Open to recognized student clubs and university organizations.
- **Timeline**: Submit via the **ClubOps Portal** (`IT Services -> Request Hotspot & Network Form`) at least **5 working days** prior to the event.
- **Required Details**:
  - Expected concurrent attendee count and total active devices (e.g., 250 laptops + 200 mobile devices).
  - Target venue zones (e.g., Auditorium Main Seating, Stage, Green Room, Balcony, or Registration Foyer).
  - Bandwidth requirements (standard 100 Mbps pipe, or dedicated high-throughput 500 Mbps – 1 Gbps symmetrical uplink).

### Step 2: Technical Specifications & Firewall Exceptions (Form IT-NET-WIFI-04)
- If the workshop requires special network protocols, specify them in Form `IT-NET-WIFI-04`:
  - **SSH / Git**: Port 22 outbound/inbound for remote server administration and code commits.
  - **Container Registries & Cloud**: Docker Hub, AWS, GCP, HuggingFace, Azure endpoints.
  - **Live Streaming / RTMP**: Port 1935 outbound for YouTube/Twitch broadcast.
  - **Custom TCP/UDP**: Ports required for IoT hardware or local client-server sockets.
- The IT Network Security Administrator approves or provides isolated network tunneling within 48 hours.

### Step 3: Dedicated SSID Provisioning & Access Credentials
- IT Network Services provisions an isolated Virtual LAN (VLAN) with traffic shaping to prevent network congestion.
- A custom, dedicated broadcast SSID is provisioned: `EVENT_<ClubName>_2026` or `WORKSHOP_GUEST_5G`.
- Organizers receive a secure QR code and a 16-character WPA3-Personal pre-shared key (PSK) or temporary 802.1X authentication credentials 24 hours prior to the workshop.
- Quality of Service (QoS) guarantees minimum 15 Mbps per attendee device and prioritized 50 Mbps bandwidth for presenter workstations.

### Step 4: Portable Mesh Hotspot Hardware Checkout & Handover
- In areas with structural signal attenuation or outdoor breakout zones, clubs can requisition high-density portable Wi-Fi 6/6E cellular-fallback mesh hotspots.
- **Pickup**: Collect the equipment from the **IT Operations Center (Room IT-104)** 1 hour before the scheduled start by depositing the physical Student ID Card of the Club Lead or Tech Coordinator.
- **Handover & Inspection**: All hotspots, power bricks, and Cat6 ethernet cables must be inspected and returned within **2 hours** after workshop conclusion.

---

## 4. Handover Protocols, Compliance & Penalties
1. **Facility Neutral State**: The auditorium stage, lighting faders, seating arrangements, and podium wiring must be restored to baseline condition immediately following the event.
2. **Late Return Penalty**: Failure to return portable Wi-Fi hotspots or AV accessories within the 2-hour window incurs a late fee of ₹500/hour charged to the club's annual budget.
3. **Suspension Clause**: Unauthorized tampering with auditorium electrical switchboards or attempting to bypass campus network security controls results in an immediate **60-day suspension** of club privileges across all campus venues.

---

### Approving Authorities
- **Prof. K. R. Sharma**, Dean of Student Affairs (DoSA)
- **Dr. V. Sen**, Chief Information Officer (CIO) & Head of Campus IT Infrastructure
- **Er. M. Adhikari**, Chief AV & Facilities Engineer
