---
layout: project
type: project
parent: frcRobots
helix: rare
image: img/frc/stackup-cad.jpg
title: "Stackup"
date: "2025"
weight: 2.35
published: true
labels:
  - Onshape
  - End Effector
  - Prototyping
  - CNC Machining
summary: "The first version of our 2025 robot for Reefscape. My role was lead mentor for the design, manufacturing, and assembly of its end effector."
---
<div class="split">
  <div class="split__text">
    <h1 class="subtitle">FRC Team 190</h1>
    <p class="meta"><em>2025 season</em></p>

    <p class="lead">Stackup was the first version of our robot for the 2025 FRC game, "Reefscape."</p>
    <p>My role was lead mentor for the design, manufacturing, and assembly of its end effector. The second version, <a href="frcRedundancy.html">Redundancy</a>, kept a similar structure for coral and added an algae claw.</p>
    <p class="links"><a href="https://www.thebluealliance.com/team/190/2025">TBA</a></p>
  </div>
  <div class="split__media">
    <figure style="--ratio:1.1336">
      <img width="738" height="651" src="../img/frc/stackup-cad.jpg" alt="Stackup robot CAD">
      <figcaption>Stackup CAD</figcaption>
    </figure>
  </div>
</div>

<div class="split">
  <div class="split__text">
    <h2 id="end-effector">End effector</h2>
    <p>The end effector had to manipulate coral onto the reef while keeping its weight and its degrees of freedom to a minimum.</p>
    <p>The goal was to score on all four levels without adding another degree of freedom. The key was getting the coral to flip up onto the vertical L4 posts, and the position of the wheels is what let us tune that.</p>
  </div>
  <div class="split__media">
      <figure style="--ratio:1.0468">
        <img width="694" height="663" src="../img/frc/stackup/end-effector-in-robot.jpg" alt="CAD of the Stackup robot with its end effector highlighted">
        <figcaption>The end effector in the robot</figcaption>
      </figure>
  </div>
</div>

<div class="split split--stack">
  <div class="split__text">
    <h2 id="prototyping">Prototyping</h2>
    <p>We went through many iterations, focused on iterating quickly, and tried to learn as much as possible from each one. We recorded results so the findings were objective.</p>
    <p>We built two prototypes, one with the wheels vertical and one with the wheels horizontal, which we called the X-wing. Both had movable wheels, so we could adjust the wheel position and the compression.</p>
  </div>
  <div class="split__media">
    <div class="media-row" style="--sum:2.5628;--row-h:440px">
      <figure style="--ratio:1.1869">
        <img width="851" height="717" src="../img/frc/stackup/vertical-wheels-cad.jpg" alt="CAD of the prototype with vertical wheels, gripping a pipe that stands in for the coral">
        <figcaption>Prototype with vertical wheels</figcaption>
      </figure>
      <figure style="--ratio:1.3759">
        <img width="948" height="689" src="../img/frc/stackup/xwing-cad.jpg" alt="CAD of the X-wing prototype, with its wheels horizontal on vertical shafts">
        <figcaption>X-wing prototype, with horizontal wheels</figcaption>
      </figure>
    </div>

    <div class="media-row" style="--sum:2.3403;--row-h:460px">
      <figure style="--ratio:1.7778">
        <video class="loop" muted loop playsinline controls preload="none" poster="../img/frc/stackup/vertical-l4.jpg" aria-label="Vertical-wheel prototype scoring on an L4 post">
          <source src="../img/frc/stackup/vertical-l4.mp4" type="video/mp4">
        </video>
        <figcaption>Vertical-wheel prototype scoring on an L4 post</figcaption>
      </figure>
      <figure style="--ratio:0.5625">
        <video class="loop" muted loop playsinline controls preload="none" poster="../img/frc/stackup/xwing-l4.jpg" aria-label="X-wing prototype scoring on an L4 post">
          <source src="../img/frc/stackup/xwing-l4.mp4" type="video/mp4">
        </video>
        <figcaption>X-wing prototype scoring on an L4 post</figcaption>
      </figure>
    </div>

    <div class="media-row" style="--sum:2.6365;--row-h:420px">
      <figure style="--ratio:2.6365">
        <img width="1400" height="531" src="../img/frc/stackup/test-log.jpg" alt="Test log for the horizontal scoring bandwidth, with a bar chart of success rate by value">
        <figcaption>Test log and success-rate chart</figcaption>
      </figure>
    </div>
  </div>
</div>

<div class="split split--stack">
  <div class="split__text">
    <h2 id="scoring-on-l4">Scoring on L4</h2>
  </div>
  <div class="split__media">
    <div class="media-row" style="--sum:1.125;--row-h:620px">
      <figure style="--ratio:0.5625">
        <video class="loop" muted loop playsinline controls preload="none" poster="../img/frc/stackup/robot-l4.jpg" aria-label="Stackup scoring on L4">
          <source src="../img/frc/stackup/robot-l4.mp4" type="video/mp4">
        </video>
        <figcaption>Stackup scoring on L4</figcaption>
      </figure>
      <figure style="--ratio:0.5625">
        <video class="loop" muted loop playsinline controls preload="none" poster="../img/frc/stackup/robot-l4-2.jpg" aria-label="Stackup scoring on L4, second view">
          <source src="../img/frc/stackup/robot-l4-2.mp4" type="video/mp4">
        </video>
        <figcaption>Stackup scoring on L4, second view</figcaption>
      </figure>
    </div>
  </div>
</div>

<div class="split split--stack">
  <div class="split__text">
    <h2 id="manufacturing">Manufacturing</h2>
    <p>The parts were made with:</p>
    <ul>
      <li>A Haas VF-4SS CNC mill</li>
      <li>A ShopSabre CNC router</li>
      <li>Powder coating</li>
      <li>A lathe, a mill, a bandsaw, and other shop tools</li>
      <li>3D printers</li>
    </ul>
  </div>
  <div class="split__media">
    <div class="media-row" style="--sum:2.5676;--row-h:480px">
      <figure style="--ratio:0.7494">
        <img width="936" height="1249" src="../img/frc/stackup/powder-coated-part.jpg" alt="A red powder-coated plate for the robot">
        <figcaption>A powder-coated part</figcaption>
      </figure>
      <figure style="--ratio:1.8182">
        <img width="1400" height="770" src="../img/frc/stackup/milling.jpg" alt="A part being cut on the CNC mill under flood coolant">
        <figcaption>Cutting on the CNC mill</figcaption>
      </figure>
    </div>
  </div>
</div>

<div class="split split--stack">
  <div class="split__text">
    <h2 id="assembly">Assembly and implementation</h2>
    <p>Final assembly had to be organized, and we checked quality as it went together: Loctite, spacers, and accuracy.</p>
    <p>Putting the end effector on the robot meant double-checking clearance, optimizing weight, and integrating it with the rest of the robot.</p>
  </div>
</div>
