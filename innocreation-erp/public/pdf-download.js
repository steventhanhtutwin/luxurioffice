(()=>{
 const panel=document.querySelector('[data-pdf-filename]');if(!panel)return;
 const button=document.getElementById('download-pdf-file'),status=document.getElementById('pdf-download-status'),sheet=document.querySelector('.print-sheet');let busy=false;
 async function download(){if(busy)return;busy=true;button.disabled=true;status.textContent='PDF ဖိုင် ပြင်ဆင်နေပါသည်…';
 try{if(typeof html2pdf!=='function')throw Error('PDF library unavailable');await document.fonts.ready;
 sheet.classList.add('pdf-capture');
 await html2pdf().set({filename:panel.dataset.pdfFilename,margin:[12,12,16,12],image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy'],avoid:['tr','.report-approvals','.report-heading']}}).from(sheet).save();
 status.textContent='PDF ဖိုင် Download ပြုလုပ်ပြီးပါပြီ။ Browser Downloads တွင် ကြည့်နိုင်ပါသည်။';
 }catch(err){console.error('PDF download:',err.message);status.textContent='PDF Download မရသေးပါ။ ပြန်နှိပ်ပါ သို့မဟုတ် Print → Save as PDF ဖြင့် သိမ်းပါ။';}
 finally{sheet?.classList.remove('pdf-capture');busy=false;button.disabled=false;}
 }
 button.addEventListener('click',download);download();
})();
