//=============================================================================
// Eagle_EventCopy.js
//=============================================================================
/*:zh
 * @target MZ
 * @plugindesc 在游戏运行时，将其它地图上的事件，临时复制到当前地图。
 * @author 老鹰
 * @url https://rpg.blue/
 * 
 * @help 
 * 
 * 【新增】
 * 
 *  1. 利用 插件指令 进行复制
 * 
 *  2. 利用 脚本 进行复制
 * 
 *       ps = { mapID: 1, eventID: 1, x: 1, y: 1, desID: 0 }
 *       $gameMap._copyList.push(ps)
 * 
 *  ※ 由于首次读取地图文件需要时间，调用复制方法后不会立刻生成新事件，而会延后几帧
 * 
 * 【删去】
 * 
 *  1. 在事件中使用 暂时消除事件 指令
 * 
 *  2. 对复制事件调用 .erase() 方法
 * 
 *  ※ 被删去的复制事件并未立刻从内存删除，而是隐藏并等待用于生成新的复制事件
 * 
 * 【保存和读取】
 * 
 *  1. 在离开地图时，当前地图的全部未被删去的复制事件会被保存
 *    （不保存完整事件数据，而是保存复制指令所需的参数，以及它最后的地图位置）
 * 
 *  2. 在回到地图时，全部保存的复制事件将再次从原地图复制过来
 * 
 * 【更新记录】
 * 
 *   2023.2.23 V1.0.0
 * 
 * 
 * @param eventIDPlus
 * @text 复制事件的最小ID
 * @desc 如未指定复制生成的事件ID，则其ID会大于该数，确保不与已有事件冲突
 * @type number
 * @default 100
 *
 * 
 * @command addCopy
 * @text 复制一个事件
 * @desc 从指定地图复制一个事件到当前地图，并且可以指定复制后事件的ID
 *
 * @arg mapID
 * @type number
 * @text 原事件所在地图ID
 * @desc 从哪张地图找需要复制的事件？
 * @default 0
 *
 * @arg eventID
 * @type number
 * @text 原事件的ID
 * @desc 在它原本的地图上，它的事件ID是？
 * @default 1
 *
 * @arg x
 * @type number
 * @text 复制后的x位置
 * @desc 复制后生成的新事件在当前地图的x位置
 * @default 1
 *
 * @arg y
 * @type number
 * @text 复制后的y位置
 * @desc 复制后生成的新事件在当前地图的y位置
 * @default 1
 *
 * @arg desID
 * @type number
 * @text 复制后新事件的ID
 * @desc 指定复制后新事件的ID，如果为0，则会取预设值或当前地图最大事件ID，并再加1，以确保不与已有事件冲突
 * @default 0
 * 
*/

//-----------------------------------------------------------------
// 缓存
var Eagle_Cache = Eagle_Cache || {};

Eagle_Cache.mapData = {};
Eagle_Cache.mapLoading = 0;

Eagle_Cache.loadMapData = function(mapID) {
    if (Eagle_Cache.mapData[mapID])
        return Eagle_Cache.mapData[mapID];

    if (Eagle_Cache.mapLoading === mapID) {
        if (!!window["Eagle_tempMapData"]) {
            Eagle_Cache.mapData[mapID] = window["Eagle_tempMapData"];
            return Eagle_Cache.mapData[mapID];
        }
        return null;
    }

    if (mapID == 0)
        mapID = $gameMap.mapID();
    const filename = "Map%1.json".format(mapID.padZero(3));
    DataManager.loadDataFile("Eagle_tempMapData", filename);

    Eagle_Cache.mapLoading = mapID;
    return null;
}

//-----------------------------------------------------------------
// 初始化
var Eagle = Eagle || {};
Eagle.EventCopy = {};

//-----------------------------------------------------------------
// 读取插件参数 
(function () {
    const params = PluginManager.parameters('Eagle_EventCopy');
    Eagle.EventCopy.eventIDPlus = Number(params.eventIDPlus);
})();

//-----------------------------------------------------------------
// 处理插件指令
PluginManager.registerCommand('Eagle_EventCopy', "addCopy", function (args) {
    ps = {};
    ps["mapID"] = Number(args.mapID);
    ps["eventID"] = Number(args.eventID);
    ps["x"] = Number(args.x);
    ps["y"] = Number(args.y);
    ps["desID"] = Number(args.desID);
    $gameMap._copyList.push(ps);
});

//-----------------------------------------------------------------
(() => {
    //-----------------------------------------------------------------
    // Game_System
    Game_System.prototype.saveEventCopy = function (mapID, events) {
        this._eventCopyData = this._eventCopyData || {};
        this._eventCopyData[mapID] = [];
        for (const event of events) {
            if (event instanceof Game_EventCopy && event.needSave()) {
                event._eventCopyParams["x"] = event.x;
                event._eventCopyParams["y"] = event.y;
                this._eventCopyData[mapID].push(event._eventCopyParams);
            }
        }
    };
    Game_System.prototype.loadEventCopy = function (mapID) {
        this._eventCopyData = this._eventCopyData || {};
        let pss = this._eventCopyData[mapID];
        if (pss)
            for (const ps of pss)
                $gameMap._copyList.push(ps);
    };

    //-----------------------------------------------------------------
    // Game_Player
    const game_player_performTransfer_old = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function () {
        if (this.isTransferring()) {
            if (this._newMapId !== $gameMap.mapId() || this._needsMapReload) {
                // 此时还是旧地图，存储复制的事件
                $gameSystem.saveEventCopy($gameMap.mapId(), $gameMap._events);
            }
        }
        game_player_performTransfer_old.call(this);
    };

    //-----------------------------------------------------------------
    // Game_Map 
    const game_map_setupEvents_old = Game_Map.prototype.setupEvents;
    Game_Map.prototype.setupEvents = function() {
        game_map_setupEvents_old.call(this);
        this._copyList = [];  // 等待生成 Game_Event 的队列
        this._copyCreateList = [];  // 等待生成 Sprite_Character 的队列
        this._copyFinList = [];   // 等待复用的 Game_Event 的队列
        // 读取上一次存储的复制事件
        $gameSystem.loadEventCopy(this.mapId());
    };

    const game_map_updateEvents_old = Game_Map.prototype.updateEvents;
    Game_Map.prototype.updateEvents = function() {
        game_map_updateEvents_old.call(this);
        if (this._copyList.length > 0) {
            this.createCopyEvents();
        }
    };

    Game_Map.prototype.createCopyEvents = function() {
        while (true) {
            if (this._copyList.length === 0)
                return;
            let ps = this._copyList[0];
            let mapData = Eagle_Cache.loadMapData(ps["mapID"]);
            if(mapData === null) {  // 等待地图数据读取
                return;
            }
            let eventData = mapData.events[ps["eventID"]];
            let eid = ps["desID"];
            if (eid === 0) {
                eid = this._events.length;
                let v = Eagle.EventCopy.eventIDPlus + 1;
                eid = eid > v ? eid : v;
            }
            let e;
            if (this._copyFinList.length > 0) {
                e = this._copyFinList.pop();
                eid = e._eventId;
                e.initialize(this._mapId, eid, eventData, ps);
            } else {
                e = new Game_EventCopy(this._mapId, eid, eventData, ps);
            }
            this._events[eid] = e;
            this._copyList.shift();
            this._copyCreateList.push(e);
        }
    };

    //-----------------------------------------------------------------
    // Game_EventCopy
    function Game_EventCopy() {
        this.initialize(...arguments);
    }
    Game_EventCopy.prototype = Object.create(Game_Event.prototype);
    Game_EventCopy.prototype.constructor = Game_EventCopy;

    Game_EventCopy.prototype.initialize = function (mapId, eventId, eventData, ps) {
        Game_Character.prototype.initialize.call(this);
        this._fromCopy = true;
        this._mapId = mapId;
        this._eventId = eventId;
        this._eventData = eventData;
        this._eventCopyParams = ps;
        this.locate(ps["x"], ps["y"]);
        this.refresh();
    };

    Game_EventCopy.prototype.event = function () {
        return this._eventData;
    };

    Game_EventCopy.prototype.erase = function () {
        this._erased = true;
        this.refresh();
        $gameMap._copyFinList.push(this);
    };

    Game_EventCopy.prototype.needSave = function () {
        return this._erased !== true;
    };

    //-----------------------------------------------------------------
    // Spriteset_Map
    const spriteset_map_createLowerLayer_old = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        spriteset_map_createLowerLayer_old.call(this);
        this.createCopyEvents();
    };

    const spriteset_map_update_old = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        spriteset_map_update_old.call(this);
        this.updateCopyEvents();
    };

    Spriteset_Map.prototype.createCopyEvents = function () {
        this._characterSprites_copy = [];
    };

    Spriteset_Map.prototype.updateCopyEvents = function () {
        if ($gameMap._copyCreateList.length > 0) {
            for (const event of $gameMap._copyCreateList) {
                // 如果有同ID的，则先删去
                let s = this._characterSprites.find(s => s._character._eventId === event._eventId);
                if (s)
                    this._tilemap.removeChild(s);
                s = this._characterSprites_copy.find(s => s._character._eventId === event._eventId);
                if (s)
                    this._tilemap.removeChild(s);
                
                let sprite = new Sprite_Character(event);
                this._characterSprites_copy.push(sprite);
                this._tilemap.addChild(sprite);
            }
            $gameMap._copyCreateList.length = 0;
        }
    };

    const spriteset_map_findTargetSprite_old = Spriteset_Map.prototype.findTargetSprite;
    Spriteset_Map.prototype.findTargetSprite = function (target) {
        let r = spriteset_map_findTargetSprite_old.call(this);
        if (r) 
            return r;
        return this._characterSprites_copy.find(sprite => sprite.checkCharacter(target));
    };
})();
