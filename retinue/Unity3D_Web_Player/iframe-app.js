function swf_onconnect() {
    App.pipe(1);
}

function swf_onstart() {
    App.pipe(2);
}

function swf_onprogress(a) {
    App.pipe(3, a);
}

function swf_onerror(a) {
    App.pipe(4, a);
}

function swf_ontimeout() {
    App.pipe(5);
}

function swf_onload() {
    App.pipe(6);
}

(function (d, h) {
    var s = d.document,
        o = d.location,
        c = Math,
        k = decodeURIComponent,
        m = d.navigator.userAgent.indexOf("MSIE") !== -1;

    function e(t) {
        return typeof t == "string" ? s.getElementById(t) : t;
    }

    function r(t, u) {
        setTimeout(t, u || 10);
    }

    function l(u) {
        var t = new Date().getTime();
        return u + (u.indexOf("?") != -1 ? "&" : "?") + t;
    }

    function a(t, u) {
        return c.max(t - u, 0) - c.floor(c.max(t - u, 0) / 2);
    }

    function j(v, u) {
        for (var t in u) {
            if (u.hasOwnProperty(t)) {
                v[t] = u[t];
            }
        }
        if (arguments.length > 2) {
            return arguments.callee.apply(
                null,
                [v].concat([].slice.call(arguments, 2))
            );
        }
        return v;
    }

    function f(t, u) {
        var w = "[?&&amp;]" + t + "=([^&]*)(&?)",
            v = o.search.match(new RegExp(w, "i"));
        return v ? (typeof u == "function" ? u.call(null, v[1]) : v[1]) : v;
    }

    function b(t) {
        t = t || "|";
        return o.hash.substr(1).split(t);
    }

    function i(y) {
        var u = k(y || ""),
            v,
            w = {};
        if (u) {
            var v = u.split("&"),
                x;
            for (var t = v.length - 1; t >= 0; t--) {
                x = (v[t] || "").split("=");
                if (x.length > 1) {
                    w[x[0]] = k(x[1]);
                }
            }
        }
        return w;
    }

    var n = j(
        {id: "player", width: 640, height: 480},
        d.swfAttrs || {},
        f("attrs", i) || {}
    );
    var q = {
            backgroundcolor: "000000",
            bordercolor: "000000",
            textcolor: "FFFFFF",
            disableExternalCall: true,
            disableContextMenu: true,
            disableFullscreen: false,
        },
        g = j(d.swfPars || {}, f("pars", i) || {});
    if (!g.allowContextMenu) {
        j(q, {disableContextMenu: true});
    }
    if (!g.allowFullscreen) {
        j(q, {disableFullscreen: true});
    }
    if (g.allowScriptAccess == "never") {
        j(q, {disableExternalCall: true});
    }
    j(s.body.style, {textAlign: "center", overflow: "hidden"});
    if (m) {
        s.body.parentNode.style.overflow = "hidden";
    }
    var p = {
        pipe: function () {
            var v = [].slice.call(arguments, 0),
                t = f("cb") || "PLA",
                u = f("hn"),
                z = "proxy-iframe",
                w,
                x;
            if (u) {
                x =
                    "http://" +
                    u +
                    "/proxy.html?cb=" +
                    t +
                    "&ag=" +
                    v.join(",") +
                    "&_r=" +
                    new Date().getTime();
                w = e(z);
                if (!w) {
                    w = s.createElement("iframe");
                    w.id = z;
                    w.style.display = "none";
                    s.body.insertBefore(w, s.body.firstChild);
                }
                w.src = x;
            } else {
                try {
                    d.parent[t].apply(null, v);
                } catch (y) {
                }
            }
        },
        unity3d: function () {
            unityObject.setFullSizeMissing(true);
            unityObject.embedUnity(n.id, n.src, 640, 480, q, null, p.loaded);
        },
        loaded: function (t) {
            var downloadUrl, clickFuncStr, player;
            if (t.success) {
                swf_onprogress(100);
                swf_onload();
                p.resize();
            } else {
                alert("Unity3D Web 小游戏无法加载，可能需要更换启动浏览器或是安装运行库")
            }
        },
        init: function () {
            p.unity3d();
            swf_onconnect();
            swf_onstart();
            if (d.addEventListener) {
                d.addEventListener("resize", p.resize, false);
            } else {
                (function () {
                    p.resize();
                    r(arguments.callee);
                })();
            }
        },
        resize: function () {
            var B = b(),
                z = B && parseInt(B[0]),
                v = B && parseInt(B[1]),
                w = (s.documentElement || s.body)["clientWidth"],
                u = (s.documentElement || s.body)["clientHeight"],
                A = 0,
                y = 0,
                x = unityObject.getObjectById(n.id),
                t;
            if (x) {
                t = x.parentNode;
                if (!z || !v) {
                    if (!f("rs")) {
                        t.style.width = x.style.width = x.width = w + "px";
                        t.style.height = x.style.height = x.height = u + "px";
                    } else {
                        t.style.marginTop = a(u, x.height) + "px";
                    }
                } else {
                    t.style.width = x.style.width = x.width = z + "px";
                    t.style.height = x.style.height = x.height = v + "px";
                    t.style.marginTop = a(u, v) + "px";
                }
            }
        },
    };
    d.App = p;
})(this);
