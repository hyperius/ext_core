Ext.lib.Event = function() {
    var loadComplete = false,
        listeners = {},
        unloadListeners = {},
        retryCount = 0,
        onAvailStack = [],
        _interval,
        locked = false,
        win = window,
        doc = document,

        // constants
        POLL_RETRYS = 200,
        POLL_INTERVAL = 20,
        EL = 0,
        TYPE = 0,
        FN = 1,
        WFN = 2,
        OBJ = 2,
        ADJ_SCOPE = 3,
        SCROLLLEFT = 'scrollLeft',
        SCROLLTOP = 'scrollTop',
        UNLOAD = 'unload',
        MOUSEOVER = 'mouseover',
        MOUSEOUT = 'mouseout',
        // private
        doAdd = function() {
            var ret;
            if (win.addEventListener) {
                ret = function(el, eventName, fn, capture) {
                    if (eventName == 'mouseenter') {
                        fn = fn.createInterceptor(checkRelatedTarget);
                        el.addEventListener(MOUSEOVER, fn, (capture));
                    } else if (eventName == 'mouseleave') {
                        fn = fn.createInterceptor(checkRelatedTarget);
                        el.addEventListener(MOUSEOUT, fn, (capture));
                    } else {
                        el.addEventListener(eventName, fn, (capture));
                    }
                    return fn;
                };
            } else if (win.attachEvent) {
                ret = function(el, eventName, fn, capture) {
                    el.attachEvent("on" + eventName, fn);
                    return fn;
                };
            } else {
                ret = function(){};
            }
            return ret;
        }(),
        // private
        doRemove = function(){
            var ret;
            if (win.removeEventListener) {
                ret = function (el, eventName, fn, capture) {
                    if (eventName == 'mouseenter') {
                        eventName = MOUSEOVER;
                    } else if (eventName == 'mouseleave') {
                        eventName = MOUSEOUT;
                    }
                    el.removeEventListener(eventName, fn, (capture));
                };
            } else if (win.detachEvent) {
                ret = function (el, eventName, fn) {
                    el.detachEvent("on" + eventName, fn);
                };
            } else {
                ret = function(){};
            }
            return ret;
        }();

    function checkRelatedTarget(e) {
        return !elContains(e.currentTarget, pub.getRelatedTarget(e));
    }

    function elContains(parent, child) {
       if(parent && parent.firstChild){
         while(child) {
            if(child === parent) {
                return true;
            }
            child = child.parentNode;
            if(child && (child.nodeType != 1)) {
                child = null;
            }
          }
        }
        return false;
    }


    // private
    function _getCacheIndex(el, eventName, fn) {
        var i, len, li;
        if (listeners[el.id] === undefined) {
            return -1;
        }
        for (i = 0, len = listeners[el.id].length; i < len; ++i) {
            li = listeners[el.id][i];
            if (li[TYPE] == eventName && li && li[FN] == fn) {
                return i;
            }
        }
        return -1;
    }

    // private
    function _tryPreloadAttach() {
        var ret = false,
            notAvail = [],
            element, i, len, v,
            tryAgain = !loadComplete || (retryCount > 0);

        if (!locked) {
            locked = true;

            for (i = 0, len = onAvailStack.length; i < len; i++) {
                v = onAvailStack[i];
                if(v && (element = doc.getElementById(v.id))){
                    if(!v.checkReady || loadComplete || element.nextSibling || (doc && doc.body)) {
                        element = v.override ? (v.override === true ? v.obj : v.override) : element;
                        v.fn.call(element, v.obj);
                        v = null;
                    } else {
                        notAvail.push(v);
                    }
                }
            }

            retryCount = (notAvail.length === 0) ? 0 : retryCount - 1;

            if (tryAgain) {
                startInterval();
            } else {
                clearInterval(_interval);
                _interval = null;
            }

            ret = !(locked = false);
        }
        return ret;
    }

    // private
    function startInterval() {
        if(!_interval){
            var callback = function() {
                _tryPreloadAttach();
            };
            _interval = setInterval(callback, POLL_INTERVAL);
        }
    }

    // private
    function getScroll() {
        var dd = doc.documentElement,
            db = doc.body;
        if(dd && (dd[SCROLLTOP] || dd[SCROLLLEFT])){
            return [dd[SCROLLLEFT], dd[SCROLLTOP]];
        }else if(db){
            return [db[SCROLLLEFT], db[SCROLLTOP]];
        }else{
            return [0, 0];
        }
    }

    // private
    function getPageCoord (ev, xy) {
        ev = ev.browserEvent || ev;
        var coord  = ev['page' + xy];
        if (!coord && coord !== 0) {
            coord = ev['client' + xy] || 0;

            if (Ext.isIE) {
                coord += getScroll()[xy == "X" ? 0 : 1];
            }
        }

        return coord;
    }

    var pub =  {
        onAvailable : function(p_id, p_fn, p_obj, p_override) {
            onAvailStack.push({
                id:         p_id,
                fn:         p_fn,
                obj:        p_obj,
                override:   p_override,
                checkReady: false });

            retryCount = POLL_RETRYS;
            startInterval();
        },


        addListener: function(el, eventName, fn) {
            var ret, id = Ext.id(el);
            el = Ext.getDom(el);
            if (el && fn) {
                if (UNLOAD == eventName) {
                    if (unloadListeners[id] === undefined) {
                        unloadListeners[id] = [];
                    }
                    ret = !!(unloadListeners[id].push([eventName, fn])); //[TYPE, FN]
                } else {
                    if (listeners[id] === undefined){
                        listeners[id] = [];
                    }
                    listeners[id].push([eventName, fn, ret = doAdd(el, eventName, fn, false)]); // [TYPE, FN, WFN]
                }
            }
            return !!ret;
        },

        removeListener: function(el, eventName, fn) {
            el = Ext.getDom(el);

            var ret = false,
                id = el.id,
                i, index, len, cacheItem, li;

            if(!fn) {
                ret = this.purgeElement(el, false, eventName);
            } else if (UNLOAD == eventName) {
                if (unloadListeners[id] === undefined) {
                    return false;
                }
                for (i = 0, len = unloadListeners[id].length; i < len; i++) {
                    li = unloadListeners[id][i];
                    if (li && li[TYPE] == eventName && li[FN] == fn) {
                        unloadListeners[id].splice(i, 1);
                        ret = true;
                    }
                }
                if (!unloadListeners[id].length) {
                    delete listeners[id];
                }
            } else {
                (arguments[3] === 0) ? index = 0 : index = arguments[3] || _getCacheIndex(el, eventName, fn);
                cacheItem = listeners[id][index];

                if (el && cacheItem) {
                    doRemove(el, eventName, cacheItem[WFN], false);
                    delete listeners[id][index][FN];
                    delete listeners[id][index][TYPE];
                    listeners[id].splice(index, 1);
                    if (!listeners[id].length) {
                        delete listeners[id];
                    }
                    ret = true;
                }
            }
            return ret;
        },

        getTarget : function(ev) {
            ev = ev.browserEvent || ev;
            return this.resolveTextNode(ev.target || ev.srcElement);
        },

        resolveTextNode : Ext.isGecko ? function(node){
            if(!node){
                return;
            }
            // work around firefox bug, https://bugzilla.mozilla.org/show_bug.cgi?id=101197
            var s = HTMLElement.prototype.toString.call(node);
            if(s == '[xpconnect wrapped native prototype]' || s == '[object XULElement]'){
                return;
            }
            return node.nodeType == 3 ? node.parentNode : node;
        } : function(node){
            return node && node.nodeType == 3 ? node.parentNode : node;
        },

        getRelatedTarget : function(ev) {
            ev = ev.browserEvent || ev;
            return this.resolveTextNode(ev.relatedTarget ||
                    (ev.type == MOUSEOUT ? ev.toElement :
                     ev.type == MOUSEOVER ? ev.fromElement : null));
        },

        getPageX : function(ev) {
            return getPageCoord(ev, "X");
        },

        getPageY : function(ev) {
            return getPageCoord(ev, "Y");
        },


        getXY : function(ev) {
            return [this.getPageX(ev), this.getPageY(ev)];
        },

        stopEvent : function(ev) {
            this.stopPropagation(ev);
            this.preventDefault(ev);
        },

        stopPropagation : function(ev) {
            ev = ev.browserEvent || ev;
            if (ev.stopPropagation) {
                ev.stopPropagation();
            } else {
                ev.cancelBubble = true;
            }
        },

        preventDefault : function(ev) {
            ev = ev.browserEvent || ev;
            if (ev.preventDefault) {
                ev.preventDefault();
            } else {
                ev.returnValue = false;
            }
        },

        getEvent : function(e) {
            e = e || win.event;
            if (!e) {
                var c = this.getEvent.caller;
                while (c) {
                    e = c.arguments[0];
                    if (e && Event == e.constructor) {
                        break;
                    }
                    c = c.caller;
                }
            }
            return e;
        },

        getCharCode : function(ev) {
            ev = ev.browserEvent || ev;
            return ev.charCode || ev.keyCode || 0;
        },

        //clearCache: function() {},

        _load : function(e) {
            loadComplete = true;
            var EU = Ext.lib.Event;
            if (Ext.isIE && e !== true) {
        // IE8 complains that _load is null or not an object
        // so lets remove self via arguments.callee
                doRemove(win, "load", arguments.callee);
            }
        },

        purgeElement : function(el, recurse, eventName) {
            var me = this,
                i, l, v, len;
            l = me.getListeners(el, eventName) || [];
            for (i = 0, len = l.length; i < len; i++) {
                v = l[i];
                if(v) {
                    me.removeListener(el, v.type, v.fn, v.idx);
                }
            }

            if (recurse && el && el.childNodes) {
                for (i = 0, len = el.childNodes.length; i < len; i++) {
                    me.purgeElement(el.childNodes[i], recurse, eventName);
                }
            }
        },

        getAllListeners : function() {
            return [ listeners, unloadListeners ];
        },

        getListeners : function(el, eventName) {
            var me = this,
                results = [],
                id = el.id,
                j, i, l, searchLists, searchList;

            if (eventName){
                searchLists = eventName == UNLOAD ? [ unloadListeners ] : [ listeners ];
            }else{
                searchLists = [ listeners, unloadListeners ];
            }

            for (j = 0; j < searchLists.length; j++) {
                searchList = searchLists[j];
                if (searchList[id] !== undefined) {
                    for (i = 0,len = searchList[id].length; i < len; i++) {
                        l = searchList[id][i];
                        if (l &&
                            (!eventName || eventName === l[0])) {
                            results.push({
                                type:   l[TYPE],
                                fn:     l[FN],
                                obj:    l[OBJ],
                                adjust: l[ADJ_SCOPE],
                                idx: i
                            });
                        }
                    }
                }
            };

            return results.length ? results : null;
        },

        _unload : function(e) {
             var EU = Ext.lib.Event,
                i, j, l, v, ul, id, len, index, scope;


            for (id in unloadListeners) {
                ul = unloadListeners[id];
                for (i = 0, len = ul.length; i < len; i++) {
                    v = ul[i];
                    if (v) {
                        try{
                            scope = v[ADJ_SCOPE] ? (v[ADJ_SCOPE] === true ? v[OBJ] : v[ADJ_SCOPE]) :  win;
                            v[FN].call(scope, EU.getEvent(e), v[OBJ]);
                        }catch(ex){}
                    }
                }
            };

            unloadListeners = null;

            if (listeners && listeners.length > 0) {
               for (id in listeners) {
                  if (!listeners.hasOwnProperty(id)) continue;
                  j = listeners[id].length;
                  while (j) {
                      index = j - 1;
                      l = listeners[id][index];
                      if (l) {
                          EU.removeListener(id, l[TYPE], l[FN], index);
                      }
                      j = j - 1;
                  }
                  l = null;
                }

                EU.clearCache();
            }

            doRemove(win, UNLOAD, EU._unload);
        }
    };

    // Initialize stuff.
    pub.on = pub.addListener;
    pub.un = pub.removeListener;
    if (doc && doc.body) {
        pub._load(true);
    } else {
        doAdd(win, "load", pub._load);
    }
    doAdd(win, UNLOAD, pub._unload);
    _tryPreloadAttach();

    return pub;
}();
