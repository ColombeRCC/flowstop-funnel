
// Sync ZIP code to hidden field
document.getElementById('zip_code') && document.getElementById('zip_code').addEventListener('input', function(){
  var h = document.getElementById('zip_hidden');
  if(h) h.value = this.value;
});

(function(){
  // --- UTM Capture ---
  function getUTMs(){
    var p=new URLSearchParams(window.location.search);
    return {
      utm_source:p.get('utm_source')||'',
      utm_medium:p.get('utm_medium')||'',
      utm_campaign:p.get('utm_campaign')||'',
      utm_term:p.get('utm_term')||'',
      utm_content:p.get('utm_content')||'',
      matchtype:p.get('matchtype')||'',
      network:p.get('network')||'',
      device:p.get('device')||'',
      adgroupid:p.get('adgroupid')||'',
      loc_physical:p.get('loc_physical')||'',
      placement:p.get('placement')||'',
      lp_version:p.get('lp_version')||'LP4',
      gclid:p.get('gclid')||''
    };
  }
  var utms=getUTMs();
  document.querySelectorAll('[data-utm]').forEach(function(el){
    el.value=utms[el.getAttribute('data-utm')]||'';
  });

  // --- State ---
  var currentStep=1;
  var totalSteps=4;
  var selections={};

  // --- Open overlay ---
  var _scrollYWhenOpened=0;
  function openOverlay(startStep){
    currentStep=startStep||2;
    document.querySelector('.funnel-overlay').classList.add('active');
    // iOS Safari fix: overflow:hidden on body is ignored by iOS — use position:fixed instead
    // to prevent body scroll-interception from swallowing taps inside the overlay
    _scrollYWhenOpened=window.scrollY||window.pageYOffset||0;
    document.body.style.overflow='hidden';
    document.body.style.position='fixed';
    document.body.style.top='-'+_scrollYWhenOpened+'px';
    document.body.style.width='100%';
    showStep(currentStep);
  }
  function closeOverlay(){
    document.querySelector('.funnel-overlay').classList.remove('active');
    document.body.style.overflow='';
    document.body.style.position='';
    document.body.style.top='';
    document.body.style.width='';
    window.scrollTo(0,_scrollYWhenOpened);
  }

  // --- Show step ---
  function showStep(n){
    document.querySelectorAll('.funnel-step').forEach(function(s){s.classList.remove('active')});
    var target=document.querySelector('.funnel-step[data-step="'+n+'"]');
    if(target){target.classList.add('active');window.scrollTo(0,0);}
    var pct=Math.round(((n-1)/(totalSteps-1))*100);
    var fill=document.getElementById('progress-bar-fill');
    if(fill) fill.style.width=pct+'%';
    var label=document.getElementById('progress-label-text');
    if(label) label.textContent='Step '+n+' of '+totalSteps;
  }

  // --- Choice buttons ---
  document.querySelectorAll('.choice-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var group=this.dataset.group;
      var val=this.dataset.val;
      document.querySelectorAll('.choice-btn[data-group="'+group+'"]').forEach(function(b){b.classList.remove('selected')});
      this.classList.add('selected');
      selections[group]=val;

      // Step 1: directly open overlay (no CTA button needed)
      if(group==='step1'){
        setTimeout(function(){ openOverlay(2); }, 250);
        return;
      }

      // Step 2: auto-advance to step 3
      if(group==='step2'){
        setTimeout(function(){ currentStep=3; showStep(3); }, 400);
        return;
      }

      // Other steps: enable next button as fallback
      var nextBtn=document.querySelector('.btn-next[data-group="'+group+'"]');
      if(nextBtn) nextBtn.disabled=false;
    });
  });

  // --- Next buttons in overlay (fallback / ZIP step) ---
  document.querySelectorAll('.btn-next[data-to]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var group=this.dataset.group;
      if(group && !selections[group]){
        alert('Please select an option to continue.');
        return;
      }
      var to=parseInt(this.dataset.to);
      currentStep=to;
      showStep(to);
    });
  });

  // --- Back buttons ---
  document.querySelectorAll('.btn-back[data-to]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var to=parseInt(this.dataset.to);
      if(to<=1){
        closeOverlay();
        return;
      }
      currentStep=to;
      showStep(to);
    });
  });

  // --- ZIP code step — auto-advance when 5 digits entered ---
  var zipInput=document.getElementById('zip_code');
  var zipNext=document.getElementById('zip-next');
  if(zipInput && zipNext){
    zipInput.addEventListener('input',function(){
      var val=this.value.replace(/\D/g,'').slice(0,5);
      this.value=val;
      zipNext.disabled=val.length<5;
      if(val.length===5){
        var h=document.getElementById('zip_hidden');
        if(h) h.value=val;
        // Auto-advance after brief pause
        setTimeout(function(){ currentStep=4; showStep(4); }, 600);
      }
    });
    zipInput.addEventListener('keydown',function(e){
      if(e.key==='Enter' && this.value.length>=5) zipNext.click();
    });
  }

  // --- Form validation & submit ---
  var leadForm=document.getElementById('lead-form');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var valid=true;
      ['first_name','last_name','email','phone'].forEach(function(f){
        var el=document.getElementById(f);
        if(!el||!el.value.trim()){
          if(el) el.classList.add('error');
          valid=false;
        } else {
          if(el) el.classList.remove('error');
        }
      });
      var emailEl=document.getElementById('email');
      if(emailEl && emailEl.value && !/^[^@]+@[^@]+\.[^@]+$/.test(emailEl.value)){
        emailEl.classList.add('error');
        valid=false;
      }
      if(!valid){return;}

      // Collect all data
      var formData={};
      new FormData(leadForm).forEach(function(v,k){formData[k]=v;});
      Object.assign(formData,selections);
      Object.assign(formData,utms);

      // Submit to webhook (configure your endpoint here)
      var webhook=leadForm.dataset.webhook||'';
      if(webhook){
        fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData),keepalive:true})
          .catch(function(){});
      }

      // Redirect to dedicated thank you page (use data-redirect on form for LP-specific URL)
      var redirectUrl=leadForm.dataset.redirect||'https://freequote.flowstopfloodbarrier.com/thank-you/';
      window.location.href=redirectUrl;
    });

    // Real-time error clear
    leadForm.querySelectorAll('input').forEach(function(input){
      input.addEventListener('input',function(){this.classList.remove('error');});
    });

    // iOS Safari fix: type="submit" buttons inside overflow-y:auto containers don't fire click reliably.
    // touchend fires before iOS scroll-interception can cancel it. We use a tap-vs-scroll check (dy < 10px).
    var submitBtn=leadForm.querySelector('.btn-submit');
    if(submitBtn){
      var _touchStartY=0;
      submitBtn.addEventListener('touchstart',function(e){
        _touchStartY=e.touches[0].clientY;
      },{passive:true});
      submitBtn.addEventListener('touchend',function(e){
        var dy=Math.abs(e.changedTouches[0].clientY-_touchStartY);
        if(dy<10){
          e.preventDefault();
          leadForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        }
      },{passive:false});
    }
  }
})();

