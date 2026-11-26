/* ================= no text selection: iPadOS starts selecting on a long press — stop it (typing fields excepted) ================= */
(()=>{const typing=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  document.addEventListener('selectstart',e=>{if(!typing(e.target))e.preventDefault()},true);
  document.addEventListener('dragstart',e=>{if(!typing(e.target)&&!(e.target.closest&&e.target.closest('[draggable="true"]')))e.preventDefault()},true);
  /* a selection that still sneaks in (double-tap on text) is cleared */
  document.addEventListener('selectionchange',()=>{const sel=getSelection();if(!sel||sel.isCollapsed)return;const a=document.activeElement;if(typing(a))return;try{sel.removeAllRanges()}catch(e){globalThis.__el&&globalThis.__el(e)}})})();

