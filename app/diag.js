// Diagnostics page (v0.0.2). The page itself has NO tizen access (served over http),
// so it asks the module's privileged service on 127.0.0.1:8095 instead.
(function () {
  var out = document.getElementById('out');
  var SERVICE = 'http://127.0.0.1:8095';
  var YT_ID = '111299001912'; // common Samsung YouTube app id; test target

  function row(name, ok, detail) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td></td><td></td>';
    tr.children[0].textContent = name;
    tr.children[1].className = ok === true ? 'ok' : ok === false ? 'no' : '';
    tr.children[1].textContent = (ok === true ? '✔ ' : ok === false ? '✘ ' : '') + (detail || '');
    out.appendChild(tr);
    return tr;
  }

  row('Page origin', null, location.origin);
  row('tizen in PAGE', typeof tizen !== 'undefined', typeof tizen !== 'undefined' ? 'present' : 'absent (expected)');

  var probeRow = row('Service /probe', null, 'connecting…');
  var appsRow = row('App list (via service)', null, 'pending…');

  function getJSON(url, cb, tries) {
    tries = tries || 0;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.timeout = 4000;
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb('bad json: ' + xhr.responseText.slice(0, 120), null); }
    };
    xhr.onerror = xhr.ontimeout = function () {
      if (tries < 10) { setTimeout(function () { getJSON(url, cb, tries + 1); }, 1000); }
      else cb('no response after retries', null);
    };
    xhr.send();
  }

  getJSON(SERVICE + '/probe', function (err, data) {
    if (err) {
      probeRow.children[1].className = 'no';
      probeRow.children[1].textContent = '✘ ' + err;
      appsRow.children[1].className = 'no';
      appsRow.children[1].textContent = '✘ service unreachable';
      return;
    }
    probeRow.children[1].className = 'ok';
    probeRow.children[1].textContent = '✔ tizenInService=' + data.tizenInService +
      ', hasApplication=' + data.hasApplication + ', platform=' + data.platform;

    if (data.appsError) {
      appsRow.children[1].className = 'no';
      appsRow.children[1].textContent = '✘ ' + data.appsError;
    } else {
      var apps = data.apps || [];
      var visible = apps.filter(function (a) { return a.show; });
      appsRow.children[1].className = 'ok';
      appsRow.children[1].textContent = '✔ ' + apps.length + ' apps, ' + visible.length + ' visible';
      var withIcon = 0;
      for (var i = 0; i < visible.length && i < 20; i++) {
        row('  ' + visible[i].name, null, visible[i].id + (visible[i].iconPath ? '  [icon]' : '  [no icon]'));
        if (visible[i].iconPath) withIcon++;
      }
      row('Icons available', withIcon > 0, withIcon + ' of first 20 have an icon path');
    }
  });

  document.addEventListener('keydown', function (e) {
    document.getElementById('keys').textContent = 'Last key: ' + e.keyCode + ' (' + (e.key || '') + ')';
    if (e.keyCode === 13) { // OK: ask service to launch YouTube
      var r = row('Launch YouTube (via service)', null, 'trying…');
      getJSON(SERVICE + '/launch?id=' + YT_ID, function (err, data) {
        if (err || !data) { r.children[1].className = 'no'; r.children[1].textContent = '✘ ' + err; return; }
        r.children[1].className = data.ok ? 'ok' : 'no';
        r.children[1].textContent = (data.ok ? '✔ launched ' : '✘ ') + (data.error || data.id || '');
      });
    }
    if (e.keyCode === 10009) history.back(); // Return
  });
})();
