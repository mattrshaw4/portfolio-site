function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

function queryString(qs) {
  var parts = [];
  for (var key in qs) {
    var item = qs[key];
    if (item.multiValue) {
      for (var i = 0; i < item.multiValue.length; i++) {
        parts.push(key + '=' + item.multiValue[i].value);
      }
    } else if (item.value) {
      parts.push(key + '=' + item.value);
    } else {
      parts.push(key);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value : '';
  var isWww = host.indexOf('www.') === 0;
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  var needsSlash = uri.charAt(uri.length - 1) !== '/' && lastSegment.indexOf('.') === -1;

  // One redirect hop: www to apex and/or add the trailing slash Astro builds with
  if (isWww || needsSlash) {
    var target = (isWww ? host.substring(4) : host) + uri + (needsSlash ? '/' : '');
    return redirect('https://' + target + queryString(request.querystring));
  }

  // Directory URLs serve their index.html
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  }
  return request;
}
