(function(){
    // 客户端 root='window' 服务端（node) root='exports'
    var root = this;

    // save previous value of the '_'
    var previousUnderscore = root._;

    // save bytes in the minified (but not gzipped) version
    var ArrayProto = Array.prototype,
        ObjProto = Object.prototype,
        FuncProto = Function.prototype;
    var push = ArrayProto.push,
        slice = ArrayProto.slice,
        toString = ArrayProto.toString,
        hasOwnProperty = ObjProto.hasOwnProperty;

    // all ES5 native function implementations that we hope to use
    // are declares here
    var nativeIsArray = Array.isArray,
        nativeKeys = Object.keys,
        nativeBind = FuncProto.bind,
        nativeCreate = Object.create;

    // Naked function reference for surrogate-prototype-swapping
    var Ctor = function(){};

    // create a safe reference to the Underscore object for use below
    var _ = function(obj){
        // 以下均针对OOP形式的调用
        // 如果不是OOP形式不会进入该函数

        // obj is instance of _, return obj
        if (obj instanceof _) {
            return obj;
        }

        // not an instance of _, new one
        if (!(this instanceof _)) {
            return _(obj);
        }

        this._wrapped = obj;
    };

    // export the Underscore object for NodeJs,
    // with backwards-compatibility for the old 'require()' API. exports._ = _
    // if we're in browser, add '_' as a global object. window._ = _;
    if (typeof exports !== 'undefined') {
        // 向后兼容require() API
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _;
        }
        exports._ = _;
    } else {
        root._ = _;
    }

    _.VERSION = '1.8.3';

    // internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in
    // other Underscore function
    // 内部方法 返回更加高效的 cb？
    var optimizeCb = function(func, context, argCount){
        // 没有指定this指向返回原函数
        if (context === void 0) {
            return func;
        }
        switch (argCount == null ? 3 : argCount) {
            case 1: return function(value){
                return func.call(context.value);
            };
            case 2: return function(value, other){
                return func.call(context, value, other);
            };

            // 如果有指定this, 但没有传入argCount参数 执行下面case
            // _.each _.map
            case 3: return function(value, index, collection){
                return func.call(context, value, index, collection);
            };

            // _.reduce _.reduceRight
            // [x1, x2, x3, x4].reduce(f) = f(f(f(x1, x2), x3), x4)
            case 4: return function(accumulator, value, index, collection){
                return func.call(context, accumulator, value, index, collection);
            };

            // 没有上面的switch-case语句 直接下面的return就可以，但是
            // call 比 apply快 apply运行前要对作为参数的数组进行检验和深拷贝
            return function(){
                return func.apply(context, arguments);
            };
        };

        // a mostly-internal function to genarate cbs that can be
        // applied to each element in a collection, returning the
        // desired result: either identity, an arbitrary cbs,
        // a property matcher, or a property accessor
        var cb = function(value, context, argCount){
            if (value == null) {
                return _.identity;
            }
            if (_.isFunction(value)) {
                return optimizeCb(value, context, argCount);
            }
            if (_.isObject(value)) {
                return _.matcher(value);
            }
            return _.property(value);
        };

        // iterate 迭代 Infinity 无穷
        _.iteratee = function(value, context){
            return cb(value, context, Infinity);
        };

        var createAssigner = function(keysFunc, undefinedOnly){
            // 将第二个开始的参数对象的键值对“交付”给第一个参数
            // 经典闭包 undefinedOnly在返回的参数中被引用
            return function(obj){
                var length = arguments.length;
                // 如果参数只有一个或者0个，或者传入的obj==null
                if (length < 2 || obj == null) {
                    return obj;
                }

                // 枚举第一个参数以外的参数对象
                for (var index = 1; index < length; index++) {
                    var source = arguments[index],
                        // keysFunc = _.keys or _.allKeys 提取对象的key
                        keys = keysFunc(source),
                        l = keys.length;

                    for (var i = 0; i < l; i++) {
                        var key = keys[i];
                        // _.extend 和 _.extendOwn 没有传入undefinedOnly
                        // !undefinedOnly = true, 执行 obj[key] = source[key]
                        // 后面参数对象的键值直接覆盖obj
                        // _.default, undefinedOnly = true
                        // 当且仅当obj[key] === undefined才覆盖
                        if (!undefinedOnly || obj[key] === void 0) {
                            obj[key] = source[key];
                        }
                    }
                };
                return obj;
            };
        };

        // an internal function for creating a new object
        // that inherits from another, use in _.create
        var baseCreate = function(prototype){
            // 传入的参数prototype 不是对象
            if (!_.isObject(prototype)) {
                return {};
            }
            // if 浏览器支持 ES5 Object.create
            if (nativeCreate) {
                return nativeCreate(prototype);
            }

            Ctor.prototype = prototype;
            var result = new Ctor;
            Ctor.prototype = null;
            return result;
        };

        // closure
        var property = function(key){
            return function(obj){
                return obj == null ? void 0 : obj[key];
            };
        };

        //233
    };

})()
