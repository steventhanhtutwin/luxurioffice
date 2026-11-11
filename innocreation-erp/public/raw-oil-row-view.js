(()=>{
 function navigate(event){const row=event.target.closest('.oil-clickable-transaction');if(!row)return;
 if(event.target.closest('a,button,input,select,textarea,label,form'))return;
 if(event.type==='keydown'&&(event.target!==row||!['Enter',' '].includes(event.key)))return;
 if(event.type==='click'&&(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||window.getSelection()?.toString()))return;
 event.preventDefault();window.location.assign(row.dataset.transactionUrl);
 }
 document.addEventListener('click',navigate);document.addEventListener('keydown',navigate);
})();
