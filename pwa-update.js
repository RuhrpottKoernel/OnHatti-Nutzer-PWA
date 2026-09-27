/* OnHatti Nutzer-PWA · MANUAL UPDATE R1
   Kein automatisches Update. Netzwerkzugriff fuer index.html nur nach Klick auf "OnHatti aktualisieren". */
(() => {
  'use strict';
  const ROLE = 'nutzer';
  const BUTTON_ID = 'onhattiManualUpdateButton';

  function setBusy(button, busy, text) {
    if (!button) return;
    button.disabled = !!busy;
    if (ROLE === 'firma' && button.querySelector('.startUtilityText strong')) {
      button.querySelector('.startUtilityText strong').textContent = text || 'OnHatti aktualisieren';
    } else {
      button.textContent = text || 'OnHatti aktualisieren';
    }
  }

  function makeButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const companyCards = document.querySelector('.startUtilityCards');
    if (ROLE === 'firma' && companyCards) {
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.className = 'startUtility';
      button.type = 'button';
      button.innerHTML = '<span class="startUtilityIcon">↻</span><span class="startUtilityText"><strong>OnHatti aktualisieren</strong><span>Neue Version bewusst von GitHub laden.</span></span><span class="startUtilityArrow">›</span>';
      const aboutButton = Array.from(companyCards.querySelectorAll('button')).find(b => /Über OnHatti/.test(b.textContent || ''));
      companyCards.insertBefore(button, aboutButton || null);
      button.addEventListener('click', () => runUpdate(button));
      return;
    }

    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.className = 'btn light';
      button.type = 'button';
      button.textContent = 'OnHatti aktualisieren';
      toolbar.appendChild(button);
      button.addEventListener('click', () => runUpdate(button));
      return;
    }

    if (ROLE === 'firma') {
      const setupCard = document.getElementById('setupCard');
      if (setupCard) {
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.className = 'btn';
        button.type = 'button';
        button.style.marginLeft = '8px';
        button.textContent = 'OnHatti aktualisieren';
        const setupBtn = document.getElementById('setupBtn');
        if (setupBtn && setupBtn.parentNode === setupCard) setupBtn.insertAdjacentElement('afterend', button);
        else setupCard.appendChild(button);
        button.addEventListener('click', () => runUpdate(button));
      }
    }
  }

  async function requestUpdateFromWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) {
      throw new Error('Update ist nur in der installierten/über HTTPS geöffneten PWA verfügbar.');
    }
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active || navigator.serviceWorker.controller;
    if (!worker) throw new Error('OnHatti-Service-Worker ist noch nicht aktiv. App einmal schließen und erneut öffnen.');

    return await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('Update-Prüfung hat zu lange gedauert.')), 30000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        const data = event.data || {};
        if (data.ok) resolve(data);
        else reject(new Error(data.error || 'Update konnte nicht geladen werden.'));
      };
      worker.postMessage({type:'ONHATTI_MANUAL_UPDATE_INDEX', role: ROLE}, [channel.port2]);
    });
  }

  async function runUpdate(button) {
    const original = 'OnHatti aktualisieren';
    try {
      setBusy(button, true, 'Update wird geprüft …');
      const result = await requestUpdateFromWorker();
      if (!result.changed) {
        setBusy(button, false, original);
        alert('OnHatti ist bereits aktuell.');
        return;
      }
      setBusy(button, true, 'Update geladen – Neustart …');
      alert('Die neue OnHatti-Version wurde vollständig geladen. OnHatti startet jetzt neu.');
      location.reload();
    } catch (error) {
      setBusy(button, false, original);
      alert('OnHatti-Update nicht möglich.\n\n' + String(error && error.message || error));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeButton, {once:true});
  else makeButton();
})();
