Measuring scripts for the Mac app's diagnostics mode. Put one of them as the content of `~/Applications/SEQ3-diag`
(the file's existence turns diagnostics on; its content, when not empty, replaces the built-in measurement) and start
the app; results go to `~/Applications/SEQ3-diag.log`.

- diag2.js – what the page changes per second, and script vs. style/layout time, idle and playing
- diag3.js – 8 play/stop cycles with CPU per cycle; logs what happens to the sound when the window is resized
- diag4.js – voiceclean.js + diag3.js (the same cycles with the WebKit voice clean-up)
- voiceclean.js – disconnects each note's audio nodes when the note has ended (WebKit keeps them otherwise)
