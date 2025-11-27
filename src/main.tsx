import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { generateAudio } from "./lib/tts/tts";

// generateAudio({
//   title: "Test",
//   script: `
// <voice value="female">
// I am female1
// </voice>
// <pause value="0.5"/>
// <voice value="female2">
// I am female2
// </voice>
// <pause value="0.5"/>
// <voice value="male">
// I am male1
// </voice>
// <pause value="0.5"/>
// <voice value="male2">
// I am male2
// </voice>
// <speed value="0.5">
// This is a  slow test.
// </speed>
// <speed value="2">
// This is a fast test.
// </speed>
// <volume value="0.5">
// I am quiet.
// </volume>
// <volume value="1.5">
// I am loud.
// <sound value="pop"/>
// </volume>
// <pause value="0.5"/>
// <sound value="beep"/>
// <pause value="0.5"/>
// <sound value="pop"/>
// Now follows a pop and text.
// <pause value="1"/>
// <overlay>
//   <part>
//   This is a pop sound.
//   </part>
//   <part>
//     <sound value="pop"/>
//   </part>
// </overlay>
// <pause value="1"/>
// <effect value="echo" preset="light">
// This is a test with an light echo effect.
// </effect>
// <pause value="1"/>
// <effect value="echo" preset="medium">
// This is a test with a medium echo effect.
// </effect>
// <pause value="1"/>
// <effect value="echo" preset="heavy">
// This is a test with a heavy echo effect.
// </effect>
// <pause value="1"/>
// Now follows a binaural effect.
// <effect value="binaural" preset="delta">
// This is a test with a delta binaural effect.
// </effect>
// <pause value="1"/>
// <effect value="binaural" preset="gamma">
// This is a test with a gamma binaural effect.
// </effect>
// <pause value="1"/>
// <effect value="binaural" preset="beta">
// This is a test with a beta binaural effect.
// </effect>
// <pause value="1"/>
// <effect value="binaural" preset="alpha">
// This is a test with a alpha binaural effect.
// </effect>
// <pause value="1"/>
// <effect value="binaural" preset="theta">
// This is a test with a theta binaural effect.
// </effect>
// `,
// });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/*<Provider>*/}
    <App />
    {/*</Provider>*/}
  </React.StrictMode>,
);
