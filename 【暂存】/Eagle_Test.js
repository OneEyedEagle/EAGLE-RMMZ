//=============================================================================
// Eagle_Test.js
//=============================================================================
/*:zh
 * @target MZ
 * @plugindesc 插件示范，此处是在插件列表看见的简要文本
 * @author Fux2
 *
 * @param assCount
 * @text 这是一个参数的简述文本，大部分类型会在参数列表看到这行文本
 * @desc 点开参数详细界面时显示的描述
 * @type number
 * @default 1
 *
 * @param autosaveVarId
 * @text 阻止自动存档的开关编号
 * @desc 开启这个开关后，切换地图时不会自动存档
 * @type switch
 * @default 8
 *
 * @command freeze
 * @text 准备渐变
 * @desc 渐变之前必须准备的工作，凝固画面
 *
 * @command readBook
 * @text 进入读书界面
 * @desc 进入读书界面
 *
 * @arg pictures
 * @type file[]
 * @dir img/bookPages
 * @text 用于显示的文字素材
 * @desc 用于显示的文字素材
 *
 * @command storageOperation
 * @text 打开仓库界面
 * @desc 打开仓库界面
 *
 * @arg putFlag
 * @type boolean
 * @text 是否进入储存界面
 * @desc 是否进入储存界面
 * @default true
 *
 * @command setEndingPass
 * @text 宣告通关结局
 * @desc 宣告通关结局
 *
 * @arg endIndex
 * @type select
 * @option 结局1
 * @value 0
 * @option 结局2
 * @value 1
 * @option 结局3
 * @value 2
 *
 * @help  
 * 这里显示整个插件的帮助文档，可以很长，也支持换行
 * 换行换行换行
 */

// 非必要，版本控制
var Imported = Imported || {};
if(!Imported.Eagle_Core){
	// 需求核心老鹰插件，但这里仅做示范就不抛出异常了
	// throw new Error('require Eagle_Core.js');
}

// 原本应该从核心依赖插件定义的全局变量，但这里没有核心插件，追加定义到这里
var Eagle = Eagle || {}

Imported.Eagle_Test = true;
Eagle.Eagle_Test = {};

(function(){
	const params = PluginManager.parameters('Eagle_Test');
	Eagle.Eagle_Test.assCount = Number(params.assCount);
	Eagle.Eagle_Test.autosaveVarId = Number(params.autosaveVarId);
})();


//command
PluginManager.registerCommand('Eagle_Test', "readBook", function(args) {
	SceneManager.push(Scene_ReadBook);
	SceneManager.prepareNextScene(args.pictures);
});

PluginManager.registerCommand('Eagle_Test', "storageOperation", function(args) {
	SceneManager.push(Scene_Storage);
	SceneManager.prepareNextScene(JsonEx.parse(args.putFlag));
});

PluginManager.registerCommand('Chest_Extension', "setEndingPass", function(args) {
	$gameParty.setEndingPassed(Number(args.endIndex));
});