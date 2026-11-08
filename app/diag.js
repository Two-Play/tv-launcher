// Diagnostics page: reports which Tizen/Samsung APIs this module can use on the TV.
// Written in ES5 so it runs on older Tizen web engines.
(function () {
  var out = document.getElementById('out');

  function row(name, ok, detail) {
    var tr = document.createElement('tr');
    var cls = ok === true ? 'ok' : ok === false ? 'no' : '';
    var mark = ok === true ? '✔ ' : ok === false ? '✘ ' : '';
    tr.innerHTML = '<td></td><td class="' + cls + '"></td>';
    tr.children[0].textContent = name;
    tr.children[1].textContent = mark + (detail || '');
    out.appendChild(tr);
    return tr;
  }

  function safe(name, fn) {
    try { fn(); } catch (e) { row(name, false, String(e && (e.name + ': ' + e.message) || e)); }
  }

  row('Origin', null, location.origin);
  row('User agent', null, navigator.userAgent);
  row('window.tizen', typeof tizen !== 'undefined');
  row('window.webapis', typeof webapis !== 'undefined');

  safe('Platform version', function () {
    row('Platform version', true, tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version'));
  });

  safe('Model', function () {
    row('Model', true, webapis.productinfo.getRealModel() + ' / FW ' + webapis.productinfo.getFirmware());
  });

  safe('getAppsInfo', function () {
    var r = row('getAppsInfo', null, 'pending…');
    tizen.application.getAppsInfo(function (apps) {
      var visible = apps.filter(function (a) { return a.show; });
      r.children[1].className = 'ok';
      r.children[1].textContent = '✔ ' + apps.length + ' apps (' + visible.length + ' visible): ' +
        visible.slice(0, 12).map(function (a) { return a.name + ' [' + a.id + ']'; }).join(', ');
      var withIcon = visible.filter(function (a) { return a.iconPath; })[0];
      row('Icon path sample', !!withIcon, withIcon ? withIcon.iconPath : 'none');
    }, function (e) {
      r.children[1].className = 'no';
      r.children[1].textContent = '✘ ' + e.name + ': ' + e.message;
    });
  });

  row('application.launch', typeof tizen !== 'undefined' && !!tizen.application && typeof tizen.application.launch === 'function');
  row('tizen.tvwindow', typeof tizen !== 'undefined' && !!tizen.tvwindow);
  row('tizen.tvinputdevice', typeof tizen !== 'undefined' && !!tizen.tvinputdevice);

  safe('TV sources (tvwindow)', function () {
    tizen.tvwindow.getAvailableWindows(function (w) {
      row('TV windows', true, w.join(', '));
    }, function (e) { row('TV windows', false, e.name + ': ' + e.message); });
  });

  safe('webapis.avinfo', function () {
    row('webapis.avinfo', !!webapis.avinfo, webapis.avinfo ? 'present' : 'missing');
  });

  safe('Supported keys', function () {
    var keys = tizen.tvinputdevice.getSupportedKeys().map(function (k) { return k.name; });
    row('Supported keys', true, keys.join(', '));
  });

  safe('localStorage', function () {
    localStorage.setItem('tvl-test', '1');
    row('localStorage', localStorage.getItem('tvl-test') === '1', 'read/write');
  });

  safe('Network (Open-Meteo)', function () {
    var r = row('Network (Open-Meteo)', null, 'pending…');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m');
    xhr.onload = function () {
      r.children[1].className = xhr.status === 200 ? 'ok' : 'no';
      r.children[1].textContent = (xhr.status === 200 ? '✔ ' : '✘ ') + 'HTTP ' + xhr.status;
    };
    xhr.onerror = function () { r.children[1].className = 'no'; r.children[1].textContent = '✘ request failed'; };
    xhr.send();
  });

  var launchRow = null;
  document.addEventListener('keydown', function (e) {
    document.getElementById('keys').textContent = 'Last key: ' + e.keyCode + ' (' + (e.key || '') + ')';
    if (e.keyCode === 13) {
      if (!launchRow) launchRow = row('Launch YouTube', null, 'trying…');
      try {
        tizen.application.launch('111299001912', function () {
          launchRow.children[1].className = 'ok';
          launchRow.children[1].textContent = '✔ launched';
        }, function (err) {
          launchRow.children[1].className = 'no';
          launchRow.children[1].textContent = '✘ ' + err.name + ': ' + err.message;
        });
      } catch (err) {
        launchRow.children[1].className = 'no';
        launchRow.children[1].textContent = '✘ ' + err.message;
      }
    }
    if (e.keyCode === 10009) history.back();
  });
})();
