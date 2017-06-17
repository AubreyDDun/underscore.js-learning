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

        // Math.pow(2, 53)-1 是js中能精确表示的最大数字
        var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

        // 返回参数的length属性，用来获取array以及arrayLike元素的length
        var getLength = property('length')

        // 判断是否是 ArrayLike Object
        // 类数组，拥有length属性 并且 length属性是Number型
        // 类数组：Aaary、arguments、HTML Collection(带有方法的HTML元素的集合)、NodeList
        // 包括{length: 10}这种对象、字符串、函数
        var isArrayLike = function(collection){
            var length = getLength(collection);
            return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
        };

        // Collection Functions 数组或者对象的扩展方法 25个
        // -----------------------------------------

        // 与 ES5 中的 Array.prototype.forEach 相似
        // 遍历数组或者对象中的每个元素
        // obj 数组、类数组、对象
        // iteratee 迭代的方法 对obj中每个元素都执行
        // iteratee(item, index, obj)
        // context 确定 iteratee 中可能有的this指向
        // 注意：不要传入带有key类型为Number的对象
        // _.each（Array.prototype.forEach也）不能用return跳出循环
        _.each = _.forEach = function(obj, iteratee, context){
            // 根据context确定不同的迭代函数
            iteratee = optimizeCb(iteratee, context);

            var i, length;
            if (isArrayLike(obj)) {
                for (i = 0, length = obj.length; i < length; i++) {
                    iteratee(obj[i], i, obj);
                }
            } else {
                // 如果是对象，遍历所有的key
                var keys = _.keys(obj);
                for (i = 0, length = obj.length; i < length; i++) {
                    iteratee(obj[keys[i]], keys[i], obj);
                }

            }

            // 供链式调用
            return obj;
        };

        // 与 ES5 中的 Array.prototype.map 相似
        // 遍历数组中的每个元素或者是对象中的每个属性
        // 对每个元素或属性值执行iteratee
        // 将结果保存到新数组中返回
        _.map = _.collect = function(obj, iteratee, context){
            iteratee = optimizeCb(iteratee, context);

            var keys = !isArrayLike(obj) && _.keys(obj),
                length = (keys || obj).length,
                results = Array(length);
            for (var i = 0; i < length; i++) {
                var currentKey = keys ? keys[i] : i;
                results[i] = iteratee(obj[currentKey], currentKey, obj);
            }

            return results;
        };

        // create a reducing function iterating left or reduceRight
        // dir === 1 -> _.reduce
        // dir === -1 -> _.reduceRight
        function createReduce(dir){
            function iterator(obj, iteratee, memo, keys, index, length){
                for (; index > 0 && index < length; index += dir) {
                    var currentKey = keys ? keys[index] : index;
                    memo = iteratee(memo, obj[currentKey], currentKey, obj);
                }
                // 每次迭代返回值，供下次迭代调用
                return memo;
            }

            return function(obj, iteratee, memo, context){
                iteratee = optimizeCb(iteratee, context, 4);
                var keys = !isArrayLike(obj) && _.keys(obj),
                    length = (keys || obj).length,
                    index = dir > 0 ? 0 : length -1;
                // 如果没有指定初始值，则第一个元素或最后一个元素作为初始值 // TODO 原来是说第一个元素 讲错
                if (arguments.length < 3) {
                    memo = obj[keys ? keys[index] : index];
                    index += dir;
                }
                return iterator(obj, iteratee, memo, keys, index, length);
            };
        };

        _.reduce = _.foldl = _.inject = createReduce(1);

        _.reduceRight = _.foldr = createReduce(-1);

        // 寻找数组或对象中第一个满足条件的元素，返回该值
        _.find = _.detect = function(obj, predicate, context){
            var key;
            if (isArrayLike(obj)) {
                key = _.findIndex(obj, predicate, context);
            } else {
                key = _.findKey(obj, predicate, context);
            }

            if (key !== void 0 && key !== -1) {
                return obj[key];
            }
        };

        // 与 ES5 中 Array.prototype.filter 相似
        // _.filter(list, predicate, [context])
        _.filter = ._select = function(obj, predicate, context){
            var results = [];
            predicate = cb(predicate, context);
            _.each(obj, function(value, index, list){
                if (predicate(value, index, list)) {
                    results.push(value);
                }
            });
            return results;
        };

        // 所得的数组是_.filter的补集，所有不满足条件的元素
        _.reject = function(obj, predicate, context){
            return _.filter(obj, _negate(cb(predicate)), context);
        };

        // ES5 中的 Array.prototype.every 相似
        // 判断是否数组中的每个元素或对象中的每个value都符合predicate函数的判断条件
        // _.every(list, [predicate], [context])
        _.every = _.all = function(obj, predicate, context){
            predicate = cb(predicate, context);

            var keys = !isArrayLike(obj) && _.keys(obj),
                length = (keys || obj).length;
            for (var i = 0; i < length; i++) {
                var currentKey = keys ? keys[i] : i;
                if (!predicate(obj[currentKey], currentKey, obj)) {
                    return false;
                }
            }
            return true;
        };

        // ES5 中的 Array.prototype.some 相似
        // 判断是否数组中有一个元素或对象中有一个value符合predicate函数的判断条件
        // _.some(list, [predicate], [context])
        _.some = _.any = function(obj, predicate, context){
            predicate = cb(predicate, context);

            var keys = !isArrayLike(obj) && _.keys(obj),
                length = (keys || obj).length;
            for (var i = 0; i < length; i++) {
                var currentKey = keys ? keys[i] : i;
                if (predicate(obj[currentKey], currentKey, obj)) {
                    return true;
                }
            }
            return false;
        };

        // 数组或对象中是否有指定value
        _.contain = _.includes = _.include = function(obj, item, fromIndex, guard){
            // 如果是对象，返回value组成的Array
            if (!isArrayLike(obj)) {
                obj = _.values(obj);
            }
            // fromIndex查询起始位置，不指定则默认从头找
            if (typeof fromIndex != 'number' || guard) {
                fromIndex = 0;
            }
            return _.indexOf(obj, item, fromIndex) >= 0;
        };

        // 数组或对象中的每个元素都调用method，返回调用后的结果
        // method后面的参数会被当作method的参数传入
        _.invoke = function(obj, method){
            var args = slice.call(arguments, 2);
            var isFunc = _.isFunction(method);
            return _.map(obj, function(value){
                // 如果method不是函数，则可能obj的key值 obj[method]可能为函数
                var func = isFunc ? method : value[method];
                return func == null ? func : func.apply(value, args);
            });
        };

        // 一个数组，元素都是对象
        // 根据指定key，返回一个数组，其中元素是指定key的value
        // var property = function(key){
        //     return function(obj){
        //         return obj == null ? void 0 : obj[key];
        //     }
        // };
        // _.pluck(list, propertyName)
        _.pluck = function(obj, key){
            return _.map(obj, _.property(key));
        };

        // selecting only objects containing specific 'key: value' pairs
        // 根据指定键值对选择对象
        _.where = function(obj, attrs){
            return _.filter(obj, _.matcher(attrs))
        };

        // getting the first object containing specific 'key: value' pairs
        _.findWhere = function(obj, attrs){
            return _.find(obj, _.matcher(attrs));
        };

        // return the maximum element
        // 如果有iteratee 则求每个元素经过该函数迭代后的最值
        _.max = function(obj, iteratee, context){
            var result = -Infinity, lastComputed = -Infinity,
                value, computed;
            // 单纯找最值
            if (iteratee === null && obj != null) {
                // 如果是对象，寻找最大的value值
                obj = isArrayLike(obj) ? obj : _.values(obj);
                for (var i = 0, length = obj.length; i < length; i++) {
                    value = obj[i];
                    if (value > result) {
                        result = value;
                    }
                }
            } else {
                iteratee = cb(iteratee, context);
                // result保存结果元素
                // lastComputed保存计算过程中出现的最值
                _.each(obj, function(value, index, list){
                    computed = iteratee(value, index, list);
                    if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                        result = value;
                        lastComputed = computed;
                    }
                });
            }

            return result;
        };

        // return minimum element
        // 或者是计算之后的最值
        _.min = function(obj, iteratee, context){
            var result = Infinity, lastComputed = Infinity,
                value, computed;
            if (iteratee === null && obj != null) {
                obj = isArrayLike(obj) ? obj : _.values()obj;
                for (var i = 0, length = obj.length; i < length; i++) {
                    value = obj[i];
                    if (value < result) {
                        result = value;
                    }
                }
            } else {
                iteratee = cb(iteratee, context);
                _.each(obj, function(value, index, list){
                    computed = iteratee(value, index, list);
                    if (computed < lastComputed || computed === Infinity && result === Infinity) {
                        result = value;
                        lastComputed = computed;
                    }
                });
            }
            return result;
        };

        // shuffle a collection
        // 将数组乱序，如果是对象，则返回一个数组（由value组成）
        // Fisher-Yates shuffle算法，最优洗牌算法，复杂度O(n)
        // 乱序不要用sort+Math.random(), 复杂度O(nlogn)，且不是真正的乱序
        _.shuffle = function(obj){
            var set = isArrayLike(obj) ? obj : _.values(obj);
            var length = set.length;

            // 乱序之后返回的数组副本
            var shuffled = Array(length);
            for (var i = 0, rand; i < length; i++) {
                // 将当前所枚举位置的元素和'index=rand'位置的元素交换
                rand = _.random(0, index);
                if (rand !== index) {
                    shuffled[index] = shuffled [rand];
                }
                shuffled[rand] = set[index];
            }
            return shuffled;
        };

        // sample "n" random values from a collection
        // if "n" is not specified, returns a single random element
        // 如果参数是对象，则数组由values组成
        _.sample = function(obj, n, guard){
            if (n === null || guard) {
                if (!isArrayLike(obj)) {
                    obj = _.values(obj);
                }
                return obj[_.random(obj.length - 1)];
            }
            return _.shuffle(obj).slice(0, Math.max(0, n));
        };

        // sort the object's values by a criterion(标准) by an iteratee   // TODO 有疑惑 要再看
        _.sortBy = function(obj, iteratee, context){
            iteratee = cb(iteratee, context);
            // 根据指定的key返回value
            // _.pluck([{}, {}, {}], 'value') 返回数组中对象的指定key的value值
            return _.pluck(
                _.map(obj, function(value, index, list){
                    return {
                        value: value,
                        index: index,
                        // 元素经过迭代函数处理后的值
                        criteria: iteratee(value, index, list)
                    };
                }).sort(function(left, right){
                    var a = left.criteria;
                    var b = right.ccriteria;
                    if (a !== b) {
                        if (a > b || a === void 0) {
                            return 1;
                        }
                        if (a < b || b === void 0) {
                            return -1;
                        }
                    }
                    return left.index - right.index;
                }), 'value');
        };

        // _.groupBy, _.indexBy, _.countBy其实是对数组元素进行分类 TODO 再理解下
        // 分类规则就是behavior函数
        var group = function(behavior){
            return function(obj, iteratee, context){
                // 返回结果是一个对象
                var result = {};
                iteratee = cb(iteratee, context);

                _.each(obj, function(value, index){
                    var key = iteratee(value, index, obj);
                    // 按照不同的规则进行分组操作
                    // 将变量result传入，能在behavior函数中改变该值
                    behavior(result, value, key);
                });
                return result;
            };
        };

        // 根据特定规则对数组或对象 中的元素进行分组
        // result 返回值
        // value 数组元素
        // key 迭代后的值
        _.groupBy = group(function(result, value, key){
            // key是value迭代之后的值或是元素自身的属性值，根据key分组
            if (_.has(result, key)) {
                result[key].push(value);
            } else {
                result[key] = [value];
            }
        });

        _.indexBy = group(function(result, value, key){
            // key 必须是独一无二的，不然后面的会覆盖前面的
            // 其他和_.groupBy类似
            result[key] = value;
        });

        _.countBy = group(function(result, value, key){
            // 计数
            if (_.has(result, key)) {
                result[key]++;
            } else {
                result[key] = 1;
            }
        });

        // 伪数组 -> 数组，对象->提取value组成数组，返回数组
        _.toArray = function(obj){
            if (!obj) {
                return [];
            }
            if (_.isArray(obj)) {
                return slice.call(obj);
            }
            if (_.isArrayLike(obj)) {
                _.map(obj, _.identity);
            }
            return _.values(obj);
        };

        // 如果是对象，返回键值对数量
        _.size = function(obj){
            if (obj === null) {
                return 0;
            }
            return isArrayLike(obj) ? obj.length : _.keys(obj).length;
        };

        // split a collection into 2 arrays:
        // one whose elements all satisfy the given predicate
        // one whose elements all do not satisfy the predicate
        // [[pass array], [fail array]]
        _.partition = function(obj, predicate, context){
            predicate = cb(predicate, context);
            var pass = [], fail = [];
            _.each(obj, function(value, key, obj){
                (predicate(value, key, obj) ? pass : fail).push(value);
            });
            return [pass, fail];
        };
    };

})()
