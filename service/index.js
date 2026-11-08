// Privileged backend for the TV Launcher module.
// TizenBrew runs this file in a Node VM that HAS the `tizen` object, even though
// the module's web page (served over http://) does not. We expose a tiny local
// HTTP API the page can call to list and launch native Tizen apps.
// Target runtime is very old Node (~v4), so: ES5 only, no Array.includes, no async/await.
var http = require('http');
var PORT = 8095;

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

function getApps(cb) {
  if (typeof tizen === 'undefined' || !tizen.application) {
    cb('tizen.application unavailable in service', null);
    return;
  }
  try {
    tizen.application.getAppsInfo(function (apps) {
      var list = [];
      for (var i = 0; i < apps.length; i++) {
        list.push({
          id: apps[i].id,
          name: apps[i].name,
          show: apps[i].show,
          iconPath: apps[i].iconPath || null
        });
      }
      cb(null, list);
    }, function (e) { cb(e.name + ': ' + e.message, null); });
  } catch (e) { cb(String(e), null); }
}

function platform() {
  try { return tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version'); }
  catch (e) { return 'err: ' + e; }
}

var server = http.createServer(function (req, res) {
  var u = req.url || '';

  if (u.indexOf('/probe') === 0) {
    var info = {
      service: 'tv-launcher',
      tizenInService: (typeof tizen !== 'undefined'),
      hasApplication: (typeof tizen !== 'undefined' && !!tizen.application),
      platform: platform()
    };
    getApps(function (err, apps) {
      info.appsError = err;
      info.appCount = apps ? apps.length : 0;
      info.apps = apps;
      send(res, 200, info);
    });
    return;
  }

  if (u.indexOf('/launch') === 0) {
    var m = u.match(/[?&]id=([^&]+)/);
    var id = m ? decodeURIComponent(m[1]) : '';
    if (!id) { send(res, 200, { ok: false, error: 'no id' }); return; }
    try {
      tizen.application.launch(id,
        function () { send(res, 200, { ok: true, id: id }); },
        function (e) { send(res, 200, { ok: false, id: id, error: e.name + ': ' + e.message }); });
    } catch (e) { send(res, 200, { ok: false, id: id, error: String(e) }); }
    return;
  }

  send(res, 200, { service: 'tv-launcher', ok: true });
});

try {
  server.listen(PORT, '127.0.0.1');
  console.log('[tv-launcher] service listening on 127.0.0.1:' + PORT);
} catch (e) {
  console.log('[tv-launcher] listen failed: ' + e);
}
