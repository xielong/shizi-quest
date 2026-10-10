/* =========================================================================
   engine.js —— 识字大冒险的纯逻辑层（从小程序无关的角度抽取，不含任何渲染/DOM）
   来源：网页版 shizi-quest/index.html 的 <script>，逐块搬运，逻辑未改动
   包含：10 级字表(1000 字)、句子题库、自适应出题引擎(爬梯子+回头复核)、实测字库账本、
        按测到的段折算的识字量估算（+ 参数自助法区间）、熊猫/四季场景的解锁门槛
   ========================================================================= */
'use strict';

/* 难度分级（10 级共 1000 字）：1~7 级按《小羊上山》节奏 60/60/60/60/70/80/120，
   八~十星＝现代汉语字频表（Jun Da）「最常用字减去已有的」按频次补齐 150/160/180。
   越往后越难、级容量越大，前平后陡。 */
var LEVELS = [
  {stars:1, size:60, color:'#5cb8ff', name:'一星 · 小小芽',
   chars:'一二三四五六七八九十人大小上下口手日月山水火木天子个很得飞回地我你好是不了的在有他们来去说看听走进见到和也就都吧星石书出'.split('')},
  {stars:2, size:60, color:'#4fc3e8', name:'二星 · 小竹笋',
   chars:'雨这着她呀啦它可孩会能要从只让叫吃想起放学爱笑心头前后里外多少马住写把亮两中开新找用呢吗谁哪太真还再又快耳眼脚站送长点身'.split('')},
  {stars:3, size:60, color:'#4fd6a4', name:'三星 · 小树苗',
   chars:'朋友风生今饭东西朵拉巴春越认识自己洗球过问时没做第方动才加比远土成玩唱跳跑喝帮画花草树叶鸟鱼虫车路家门早晚白黑红牛习买给'.split('')},
  {stars:4, size:60, color:'#ffc93c', name:'四星 · 小灯笼',
   chars:'带喜字边田坐条包哇哭丢掉抱脸嘴最慢先怎鼻窗热停怕谢种捉迷觉空肉声音各像高闭睛题伸抓候更老发睡请被数吹往双共浇干样爬变背活'.split('')},
  {stars:5, size:70, color:'#ffab4c', name:'五星 · 小火箭',
   chars:'爸妈哥姐弟妹爷桥猫狗兔鸡鸭鹅蛋奶米面菜果汤茶糖甜歌欢穿绿暖座本青刀舞饿喊追藏捡摸腿肚梦香胖累物提采摘旁婆气急礼园尾原颗紧油踩糕泳处装猪羊熊虎'.split('')},
  {stars:6, size:80, color:'#ff8f7a', name:'六星 · 小飞船',
   chars:'猴象鹿虾蟹蜜蜂蝶蛙蛇龟燕竹松柳桃桌椅床灯美游秋冷什么等屋乌躲尝夸饱软硬尖圆因然云排队细吐味闻苹梨醒忘滑凉灵粒丛压弯碗筷杯勺锅壶盘盆桶篮伞袋帽袜裤裙鞋剪针线绳锁钥'.split('')},
  {stars:7, size:120, color:'#f5789b', name:'七星 · 小魔法',
   chars:'匙冬池塘黄流船彩戴套煮雪清泪影瘦臭突忽罐厉害酱纹丝贝壳钻搬千万腰割挂湖河海岸坡岛林森苗沙泥洞泉浪冰霜雾露虹雷溪苔藤蒲落满野夏阳光蜻蜓蜘蛛蚂蚁蝌蚪蟋蟀蜗蚯蚓蝉蚊蝇蛾蝙蝠鲸鲨珊瑚蚌熟蝴蚕翅膀巢穴鳞蹄爪稻穗犁桨帆舵炉灶檐篱筐磨锄镰藕笋芭网织鳍珠笆'.split('')},
  {stars:8, size:150, color:'#a98bff', name:'八星 · 小旋风',
   chars:'为国以对而那于之年作道行所事经法如同现当定分部其些主理但实军者意无力与机民公此已工使情明性知全关正业将间由重并应战向文体政相利产或制斯话合特代内信表化世位次度任常通教儿立及员解名论义入几平系尔别打女神总何电安报结反受目量感建务接必场件计管期市直德资命金指克许统区保至形社便决治展科司基非则却界达强即难'.split('')},
  {stars:9, size:160, color:'#8b7bff', name:'九星 · 小博士',
   chars:'且权思王完设式色记南品告类求据程北死张该交规取格望术领确传师观切院导争运步改收根造言联持组每济亲极服办议元英士证近失转夫令准布始存未台单具罗击备兵连调深商算质团集百需价党华城级整府离况亚技际约示复病息究似官断精支视消器容照须增研称企功片史委乎查轻易曾除农广显阿李标谈图念引历首医局专费号尽另周较注语仅考随选列武响虽推势参'.split('')},
  {stars:10, size:180, color:'#6f7bd4', name:'十星 · 大字王',
   chars:'希古众构房半节投某案维革划敌致陈律足态护兴派验责营够章跟志底严例防族供效续施留讲型料终答绝奇察母京段依批群项故按围江斗境客纪举杀攻父苏密低朝诉止愿值仍男钱破助倒育属帝限职速刻乐否刚威毛状率甚独般普弹校苦创假久错承印兰试股拿脑预益若微尼继血惊伤素药适波夜省初卫源食险待述陆置居劳财环福纳警获模充负龙疑层洲冲射略范竟句室异激汉村哈策演简卡罪判担州静退既衣您宗积余痛'.split('')}
];

var AGE_REF = [
  ['3 岁',        '100 ~ 300 字'],
  ['4 岁',        '300 ~ 600 字'],
  ['5 岁',        '600 ~ 1000 字'],
  ['6 岁（幼小衔接）','1000 ~ 1600 字'],
  ['一年级结束',   '1600 字左右'],
  ['二年级结束',   '2500 字左右'],
  ['三年级结束',   '3000 字左右']
];

/* =========================================================================
   SECTION: SENTENCES — 句子认读题库
   每个句子都只用上面十档字表里的字（标点不计分），小朋友整句念出来，
   家长把没念出来的字点一下。一句 5~12 个字，一次就能拿到十几个字的证据，
   比一次只测一个字快得多。句子里同一个字重复出现只统计一次。
   ========================================================================= */

var SENTENCE_TEXT=[
  '小猫饿了，想吃鱼',
  '他走出家门，来到河边',
  '河里有鱼，可是他不会游水',
  '小狗来了，说，我来帮你',
  '小狗跳下水，小鱼都跑过来了',
  '小猫一伸手，就抓到一条鱼',
  '小猫和小狗一起回家',
  '小猫说，你是我的好朋友',
  '下雨了，我不能出去玩',
  '我坐在门口看雨',
  '雨点在地上跳舞',
  '妈妈给我一杯甜牛奶',
  '我问妈妈，雨什么时候停',
  '雨停了，太阳出来了',
  '我出去踩水玩',
  '今天是小狗的生日',
  '小猫送来一条鱼',
  '小鸡送来两个鸡蛋',
  '小鸭带来一袋糖',
  '大家一起唱歌跳舞',
  '桌上有一个大蛋糕',
  '蛋糕上有五颗红果子',
  '小狗说，谢谢你们',
  '小鸭想下水游泳',
  '他站在水边，有点怕',
  '鸡妈妈说，水里很好玩',
  '小鸭闭上眼睛，跳了下去',
  '水很暖，小鸭不怕了',
  '他游得很快',
  '小鱼在旁边给他加油',
  '小鸭学会游泳了',
  '我们玩捉迷藏',
  '我闭上眼睛，数到十',
  '他们都藏在哪里呢',
  '我找到了树后的小猫',
  '门后面还有一只小狗',
  '只有小兔没找到',
  '原来他躲在桌子下面',
  '大家都笑了',
  '小兔在田里种菜',
  '他天天给菜浇水',
  '菜长高了，叶子上有小虫',
  '小兔很着急',
  '小鸟说，我来帮你捉虫',
  '小虫都被捉走了',
  '菜长得又大又绿',
  '小兔请大家来吃菜',
  '秋天到了，树叶黄了',
  '小熊要找一个树洞过冬',
  '他走了一天才找到',
  '洞里很暖，还有干草',
  '小熊抱着蜜罐睡了一觉',
  '冬天到了，雪落满了树林',
  '小熊在洞里做了一个梦',
  '春天来了，小熊醒过来',
  '天上有乌云，要下雨了',
  '蚂蚁排着队搬东西',
  '他们走了一条很长的路',
  '第一只蚂蚁走在最前面',
  '雨来了，他们都钻进了洞里',
  '洞里很干，也很暖和',
  '蚂蚁说，等雨停了再出去',
  '雨停了，草地更绿了',
  '我来到海边，海风吹得很凉',
  '沙上有各种各样的贝壳',
  '我捡到一个最好看的',
  '贝壳上有细细的花纹',
  '我把它放在耳朵旁边',
  '里面好像有海的声音',
  '我把贝壳带回了家',
  '这是大海送我的礼物',
  '妈妈带我去外婆家',
  '我们坐车走了很远',
  '外婆在门口等我们',
  '她做了一桌好菜',
  '有鱼，有汤，还有一盘肉',
  '我吃了两碗饭',
  '外婆说我长高了',
  '外婆家的空气真好',
  '秋天的果园里有好多果子',
  '苹果红了，梨子也黄了',
  '我们提着篮子去采果子',
  '我采到一个最大的苹果',
  '哥哥在树上摘桃子',
  '妹妹在树下捡落叶',
  '大家的篮子都满了',
  '回家做果酱，真甜',
  '蜗牛在草叶上慢慢地爬',
  '乌龟从水里爬上来',
  '蜗牛说，你走得真快',
  '乌龟说，我们比一比',
  '他们一起往前爬',
  '蝴蝶在旁边看着',
  '蜗牛爬到了叶子的最高处',
  '乌龟说，你真厉害',
  '谁在天上飞，小鸟在天上飞',
  '什么在水里游，小鱼在水里游',
  '什么有长鼻子，大象有长鼻子',
  '谁最爱吃桃子，猴子最爱吃桃子',
  '什么有翅膀，小鸟和蝴蝶都有翅膀',
  '谁住在山上，老虎住在山上',
  '谁的耳朵最长，小兔的耳朵最长',
  '谁会吐丝，蚕会吐丝',
  '小狗，你在做什么呀',
  '我在找我的球',
  '球在哪里呢',
  '就在你的身后呀',
  '我找到了，谢谢你',
  '我们一起去玩吧',
  '好呀，我马上就来了',
  '蜻蜓和蝴蝶在草上飞',
  '蜘蛛在屋檐下织网',
  '蚯蚓在泥土里钻来钻去',
  '蝌蚪在水里游，变成了青蛙',
  '蟋蟀在草丛里唱歌，蝉在树上叫',
  '蜗牛背着壳，慢慢地爬',
  '蝙蝠白天躲在山洞里睡觉',
  '鲸鱼和鲨鱼生活在大海里',
  '牛在田里犁地，蹄子上都是泥',
  '稻穗熟了，压弯了腰',
  '爷爷用锄头和镰刀割稻子',
  '船上有桨、帆和舵',
  '篱笆上爬满了藤',
  '竹筐里装着藕和笋',
  '屋檐下有一个鸟巢',
  '炉灶上煮着一锅香香的汤',
  '小鸟飞回来了',
  '他在地上画太阳',
  '我和你一起回家',
  '好大的一只鸟',
  '他的手上有一个果子',
  '一二三四五，六七八九十',
  '天上有日和月',
  '大人很大，小孩很小',
  '天上下的雨很大',
  '我的鞋不见了，它在床下面',
  '妈妈，我的肚子饿了',
  '小猫在追自己的尾巴',
  '我闻到了花的香味',
  '谁把糖放在我的口袋里了',
  '我数一数，一共有十只小鸟',
  '天太热了，我想吃冰',
  '这个苹果又大又圆',
  '小狗的鼻子最灵',
  '月亮圆圆的，像一个大盘子',
  '我把书放回原来的地方',
  '风一吹，花就动了',
  '妈妈的头发又黑又长',
  '爷爷的手很大，我的手很小',
  '桌上有一碗热汤',
  '冬天快到了，天越来越冷',
  '夏天的太阳很亮',
  '我有一千个问题要问你',
  '山上的野花开满了',
  '蝴蝶的翅膀上有花纹',
  '小蚂蚁在搬一粒米',
  '树的影子长长的',
  '我家的门前有一条小河',
  '他从木桥上走过去',
  '雨后的天空很清亮',
  '奶奶给我做了一双新袜子',
  '河边的石头又圆又滑',
  '小鱼在水草里躲起来',
  '我要自己穿鞋和袜子',
  '这个字我认识了',
  '小虫在叶子上睡觉',
  '妈妈问我今天学了什么',
  '我们一起数星星',
  '树叶落在我的头上',
  '他把手拉得很紧',
  '锅里的汤很香',
  '我们坐在草地上看云',
  '小鸟在巢里睡觉',
  '海里有鲸鱼和鲨鱼',
  '田里的稻子熟了',
  '蟋蟀躲在草丛的洞里',
  '蚯蚓和蝌蚪都藏在泥土里',
  '珊瑚和蚌藏在海沙里',
  '蝙蝠挂在屋檐的洞穴里',
  '爷爷用锄头锄地',
  '船上有桨和帆',
  '他跑得又快又好',
  '我先洗手，再吃饭',
  '小兔子跳得最高',
  '小猪过生日，妈妈做了一个大蛋糕',
  '小猪闻了闻，口水都流出来了',
  '妈妈不在家，小猪把蛋糕吃了',
  '小猪吃得太多，肚子变成了圆球',
  '晚上，天上飞来一个大盘子',
  '不是盘子，是外星人的飞船',
  '外星人有三个眼睛，五只脚',
  '他吃了一口苹果，说像星星一样好吃',
  '走的时候，他送给我一颗小星星',
  '大老虎怕小蚂蚁，这是真的吗',
  '蚂蚁排成队，老虎看了就跑',
  '不要小看我个子小，我什么都不怕',
  '我的袜子跑丢了，找了一天也没找到',
  '第二天，小狗把袜子带回来了',
  '妈妈说：好臭好臭，快去洗脚',
  '爸爸的鞋子也好臭，小鱼都被臭跑了',
  '弟弟做梦，喊的还是蛋糕',
  '小鱼会不会做梦？会，梦见大蛋糕',
  '我把糖藏在手里，妈妈说糖不见了',
  '妈妈说我像小猪，吃了就睡',
  '我吃面条，拉得好长好长',
  '哥哥吃了一个大苹果，肚子还好饿',
  '猴子爬到树上，把桃子都摘走了',
  '小猴子说：树上的桃子都是我的',
  '熊猫最喜欢坐着吃竹子',
  '熊猫是黑白的，吃了睡，睡了吃',
  '大象用长鼻子给自己浇水',
  '大象的鼻子长，尾巴很小',
  '月亮在天上走，我也在地上走',
  '我坐飞船去找外星人，他不在家',
  '天上的彩虹，像一座七彩的桥',
  '晚上数星星，数着数着就睡着了',
  '乌云把太阳藏起来了，天黑了',
  '雷声好大，弟弟躲到床下面',
  '夏天的晚上，我和爸爸一起看星星',
  '星星白天也天上，我们看不到',
  '蝙蝠白天睡觉，晚上才出来玩',
  '他问月亮：天黑了你怕吗',
  '月亮说：不怕，星星都在',
  '蝙蝠笑了，飞了一个晚上',
  '猫追自己的尾巴，怎么也追不到',
  '我和小狗跑，我比它快',
  '妹妹戴上了妈妈的帽，像个小大人',
  '下雪了，我们去做雪人',
  '我给雪人戴上我的小红帽',
  '雪人不怕冷，就怕太阳出来',
  '鲸鱼住在海里，鲨鱼也住在海里',
  '鲸鱼来了，小鱼都躲开了',
  '鲨鱼好厉害，一口就吃一条鱼',
  '珊瑚和蚌都住在海里',
  '海里有蚌，蚌里有小珠子',
  '青蛙吃蚊子，一口一个',
  '蚊子最怕谁？青蛙和蜘蛛',
  '蚕吐丝，把自己包了起来',
  '蝴蝶的翅膀上有花纹，像小裙子',
  '蜻蜓点水，是在生小蜻蜓呢',
  '蜗牛和乌龟比谁慢，比了一天',
  '蚯蚓在土里钻来钻去，给花松土',
  '蟋蟀在草丛里唱歌，唱了一晚上',
  '小蝌蚪长大了，就变成青蛙',
  '蜘蛛的网好厉害，蚊子一挂就跑不掉',
  '稻子熟了，爷爷用镰刀去割',
  '小船有桨，也有帆',
  '屋檐下有鸟巢，也是蜘蛛的家',
  '炉灶上煮着一锅汤，香得我睡不着',
  '篱笆上爬满了花，蜜蜂都来了',
  '竹筐里装着藕和笋，都是好吃的',
  '谁吃了我放的糖？蚂蚁说不是它',
  '谁踩了地上的花？是小猫',
  '我的书不见了，爸爸说是小熊带走了',
  '妈妈抱我一下，我就不害怕了',
  '天黑了，月亮也睡了'
];
/* 字 → 等级 反查表 */

var LEVEL_OF={};
LEVELS.forEach(function(l,i){ l.chars.forEach(function(c){ LEVEL_OF[c]=i+1; }); });

var NOT_SCORED={};
'，。！？、；：'.split('').forEach(function(c){ NOT_SCORED[c]=1; });

/* 预先把句子拆成字，算好"句内去重后的字"和难度（0.5×最难 + 0.5×平均） */

var SENTENCES=SENTENCE_TEXT.map(function(t,idx){
  var uniq=[], lvs=[];
  for(var i=0;i<t.length;i++){
    var c=t[i];
    if(NOT_SCORED[c]) continue;
    lvs.push(LEVEL_OF[c]||1);
    if(uniq.indexOf(c)<0) uniq.push(c);
  }
  var mx=Math.max.apply(null,lvs), avg=lvs.reduce(function(a,b){return a+b;},0)/lvs.length;
  return {t:t, uniq:uniq, lvs:lvs, mx:mx, avg:avg, lv:Math.max(1,Math.min(10,Math.round(0.5*mx+0.5*avg)))};
});

/* =========================================================================
   SECTION: ENGINE — 自适应出题 + 识字量估算（纯逻辑，不碰 DOM）

   出题思路：爬梯子 + 回头复核
     1) 热身 WARM_N 题（一星），先让小朋友进入状态；
     2) 阶梯：每关打一组 BLOCK 题。一组答对 ≥PASS_NEED 就往上走一关，
        不足就往下走一关。一上一下（折返）说明"会／不会"的分界正好夹在中间，
        不会因为某一道题没做出来就草草收场；
     3) 回头复核：夹住分界以后停下来回头补测——分界那一关和它下面那一关
        都补到 TOPN 题，分界上面那一关再摸 TOP_ABOVE 题。
        这样估算依据的是"分界附近的一整批题"，而不是开头那几道。
   估算：只按真正出过题的难度段折算（答对÷出了几题 × 该段字数），
        没出到题的段不给分 —— 详细口径见 SECTION: ESTIMATE。
   ========================================================================= */
/* 出题参数（下面这几个值都是跑蒙特卡洛模拟标定出来的）
   2026-10 又砍了一轮：家长反映"一次要答几十道，孩子坐不住"。
   标定结论——单场砍到 10 题上下（原来 17~23 题）。精度不再靠"一场多测"，
   而是靠 SECTION: PRIOR 的跨轮累积补回来（每轮少做点，多做几轮）。
   一块从 3 题缩成 2 题：爬梯子每关只花 2 题，同样 10 题能爬到更高、
   更容易够到孩子的真实分界（3 题一块时 2300 字的孩子第一轮会高估 80%）。 */

var WARM_N=2, BLOCK=2, PASS_NEED=1;

var TOPN=3, TOP_ABOVE=2, TOP_MAX=4, MAX_Q=10;
/* 一轮固定 10 题（2026-10-10 家长定的）。累计不满 MIN_TESTED=20 个字就先不出分数，
   第二轮累加起来自然够——不再一轮内弹窗续答 */
/* 折返夹住分界后，最少攒到这么多题才转复核（原来 13） */
var STAIR_MIN_Q=7;
/* 折返几次就算"分界夹住"了。跨轮累积以后，一轮夹住一次就够——
   下一轮会从这次的分界接着测（见 newSession 的起测关） */
var REV_NEED=1;

/* 成长值账本（2026-10-10 统一口径）：1 个成长值 = 累计认识的 1 个字。
   旧的 ×2 按答对次数记账已废——和实测主数字对不上，帽子门槛变得遥不可及 */
var EARN_RATE=1;

/* 句子认读模式的参数 */

var SENT_WARM=1;    // 暖场：前几句先挑最浅的句子

var SENT_MAX=7;     // 最多读多少句（原来 14；家长随时可以提前结束）

var SENT_CEIL=5;    // 到这么多句后，若最高档也认得不差，就早点收工

var SENT_SKIP=0.35; // 已经测过的字，再次出现的价值折扣

function shuffle(a){
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}
  return a;
}

function clamp(x,a,b){return x<a?a:(x>b?b:x);}

function wilson(k,n,z){
  if(!n) return [0,1];
  var p=k/n, z2=z*z, d=1+z2/n;
  var c=(p+z2/(2*n))/d;
  var hw=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/d;
  return [clamp(c-hw,0,1), clamp(c+hw,0,1)];
}

/* =========================================================================
   SECTION: PRIOR — 跨轮累积（把上一轮的证据折价带进这一轮）

   一场只做 10 题左右，孩子坐得住，但 10 道题的估算会飘。
   所以每轮结束时把"每段几题、对了几个"折价存下来，下一轮和本轮证据合起来算：
     · 单轮题少（孩子不累）
     · 第二、第三轮开始，识字量数字就稳下来，而且跟着新表现慢慢走
     · 起测关直接用上一轮的分界，省掉"从第 2 关重新爬上去"的那几道题

   折价系数 DECAY=0.55：约等于只保留最近两轮的活证据；
   每段上限 PRIOR_CAP=6 题：防止某一档被历史压死、后面再也不更新。

   存的是一个普通对象 {asked:{关:题数}, correct:{关:对数}}，跟存储层无关——
   网页版放 localStorage、小程序放 wx storage，都由调用方负责（engine 保持纯函数）。
   ========================================================================= */

var DECAY=0.55, PRIOR_CAP=6;

function priorCount(p){
  var n=0, k, a=(p&&p.asked)||{};
  for(k in a){ if(Object.prototype.hasOwnProperty.call(a,k)) n+=a[k]||0; }
  return n;
}
/* 一轮结束：把"合起来的总证据"折价成下一轮的先验。
   rounds 记的是"这份证据一共攒了几轮"、tested 记的是"累计测过多少个字"，
   两个都只用来给家长看和判"样本够不够"，不参与识字量计算 */
function priorTrim(asked, correct, rounds, tested, lbFloor, anchor){
  asked=asked||{}; correct=correct||{};
  var A={}, C={};
  for(var i=1;i<=LEVELS.length;i++){
    var n0=asked[i]||0;
    var n=Math.round(n0*DECAY);
    if(n>PRIOR_CAP) n=PRIOR_CAP;
    if(n<=0) continue;
    A[i]=n;
    C[i]=Math.round(n0?((correct[i]||0)/n0)*n:0);
  }
  return {asked:A, correct:C, rounds:Math.max(1,rounds||1), tested:Math.max(0,tested||0),
          lbFloor:Math.max(0,lbFloor||0), anchor:Math.max(1,anchor||1)};
}
/* 一轮结束时的收尾动作：先并（先验 + 本轮）、再折价，并把累计字数带上。
   lbFloor 是「至少」棘轮：全对轮证明过的下限存进先验，之后任何一轮的
   显示都不低于它（下限一旦被证据证明就一直成立，不会"玩着玩着变少"）。
   调用方一句 store.setPrior(mode, E.priorNext(s, floor)) 就够。 */
function priorNext(s, lbFloor, anchor){
  if(lbFloor===undefined) lbFloor=(s.prior&&s.prior.lbFloor)||0;
  if(anchor===undefined) anchor=(s.prior&&s.prior.anchor)||1;
  var mc=priorMerge(s);
  return priorTrim(mc.asked, mc.correct, (s.priorRounds||0)+1, testedTotal(s), lbFloor, anchor);
}
/* 先验 + 本轮实测 = 这一轮拿来估算的全部证据 */
function priorMerge(s){
  var A={}, C={}, k, p=s.prior;
  if(p&&p.asked){
    for(k in p.asked){
      if(!Object.prototype.hasOwnProperty.call(p.asked,k)) continue;
      A[k]=p.asked[k]||0;
      C[k]=(p.correct&&p.correct[k])||0;
    }
  }
  for(var i=1;i<=LEVELS.length;i++){
    if(!s.asked[i]) continue;
    A[i]=(A[i]||0)+s.asked[i];
    C[i]=(C[i]||0)+s.correct[i];
  }
  return {asked:A, correct:C};
}

function newSession(opt){
  opt=opt||{};
  var mode=opt.mode||'read';
  var pools=LEVELS.map(function(l){return shuffle(l.chars.slice());});
  var s={
    name:opt.name||'跳跳', age:opt.age||5, mode:mode,
    pools:pools, asked:{}, correct:{}, answers:[],
    phase:'flow',
    /* 锚定出题（2026-10-10 晚定）：每轮主要测"锚"这一级（从第 1 级起），
       每 4 题穿插 1 题高两级的抽查、1 题低一级的回顾；锚每轮最多升 1 级、
       表现差退 1 级——就算抽查全对也不往上跳，家长要的是"先低级、偶尔穿插" */
    anchor:1,
    q:null, done:false, stars:0, count:0, stopReason:'', shownLevel:0,
    earned:0, pandaShown:0
  };
  /* 上一轮折价带过来的证据（没有就是第一轮） */
  s.prior=(opt.prior&&opt.prior.asked)?opt.prior:null;
  s.priorN=priorCount(s.prior);
  s.priorRounds=(s.prior&&s.prior.rounds)||0;
  s.priorBoundary=s.prior?boundaryOfCounts(s.prior.asked, s.prior.correct, mode):0;
  /* 起测关（2026-10-10 家长定的节奏：前两轮简单居多，之后按表现调整）：
     · 第一轮：从第 1 关逐关往上爬（配合 stairDecide 里"第一轮不跳关"），
       前几题都是最简单的字，孩子先有成就感；
     · 第二轮：从上一轮分界下面两关起，还是偏简单；
     · 第三轮起：分界下面一关起，证据直接落在分界附近 */
  /* 锚定等级接着上一轮：上一轮表现好 +1、吃力 -1（见 anchorAfter），最多每轮升一级 */
  s.anchor=(opt.prior&&opt.prior.anchor)||1;
  s.startLevel=s.anchor;   /* 兼容页面/测试里显示起测关 */
  if(mode==='sentence'){
    // 句子模式：不按单字爬梯子，而是每句覆盖一批字
    s.phase='sentence';
    s.used={};          // 已经读过的句子下标
    s.seen={};          // 已经统计过的字
    s.curSentence=null; // 当前句子对象
    s.marks={};         // 当前句子被标成"不认识"的字
    s.sentCount=0;      // 已读句数
  }
  return s;
}

function pickChar(s,level){
  var pool=s.pools[level-1];
  if(pool&&pool.length) return pool.pop();
  var arr=LEVELS[level-1].chars;
  return arr[Math.floor(Math.random()*arr.length)];
}

function makeQuestion(s,level){
  var ch=pickChar(s,level);
  var q={level:level, ch:ch, options:null};
  if(s.mode==='listen'){
    var others=[], pool=LEVELS[level-1].chars;
    while(others.length<3){
      var c=pool[Math.floor(Math.random()*pool.length)];
      if(c!==ch && others.indexOf(c)<0) others.push(c);
    }
    q.options=shuffle([ch].concat(others));
    q.answer=ch;
  }
  return q;
}
/* 某难度段的"去猜测校正"认识率（听音模式已扣掉 25% 猜中率） */

function rateAt(s,i){
  var n=s.asked[i]||0; if(!n) return null;
  var guess=(s.mode==='listen')?0.25:0;
  return clamp(((s.correct[i]||0)/n-guess)/(1-guess),0,1);
}
/* 分界：第一个"认识率低于 50%"的难度段。
   返回 LEVELS.length+1 表示测过的关全都过关（分界在最高关之上）。
   拆成 boundaryOfCounts 是因为"上一轮的证据"（prior）也要用同一套口径算分界 */
function boundaryOfCounts(asked, correct, mode){
  var guess=(mode==='listen')?0.25:0;
  for(var i=1;i<=LEVELS.length;i++){
    var n=(asked&&asked[i])||0;
    if(!n) continue;
    var k=(correct&&correct[i])||0;
    var r=clamp(((k/n)-guess)/(1-guess),0,1);
    if(r<0.5) return i;
  }
  return LEVELS.length+1;
}

function findBoundary(s){ return boundaryOfCounts(s.asked, s.correct, s.mode); }
/* 复核阶段还差哪一关的题：返回关号，都不用补了就返回 0
   分界很靠前（小朋友认识的字很少）时，上面只摸 3 题，别让他连做一堆超纲字 */

function topupNext(s){
  var L=LEVELS.length, b=Math.min(s.boundary, s.lvCap||L);   /* 分界也被本轮上限压着 */
  var boost=(s.topupBoost||0);                 /* 「接着再答几道」时放开的额度 */
  var topn=TOPN+boost;
  var above=((b<=2)?3:TOP_ABOVE)+boost;
  if(b<=1){
    if((s.asked[1]||0)<topn) return 1;
    if((s.asked[2]||0)<topn) return 2;
    if((s.asked[3]||0)<above) return 3;
    return 0;
  }
  if(b>L){
    /* 分界在最高关之上（这一轮全对）：优先补"合并证据最薄的段"（第 6 关起），
       而不是只补最上面两关——高分段每段字数大，证据薄还按满折，数字会虚高 */
    var thin=0, tn=1e9, pm=(s.prior&&s.prior.asked)||{};
    for(var m2=Math.max(1,L-2);m2<=L;m2++){   /* 复核补最薄的几级（最高级下面两级起） */
      var mn=(s.asked[m2]||0)+(pm[m2]||0);
      if(mn<Math.min(topn,5) && mn<tn){ tn=mn; thin=m2; }
    }
    return thin;
  }
  if((s.asked[b]||0)<topn) return b;                     // 先把分界把关补足
  if((s.asked[b-1]||0)<topn) return b-1;                 // 再把下面稳过的那关补足
  if(b+1<=L && b+1<=(s.lvCap||L) && (s.asked[b+1]||0)<above) return b+1;      // 上面再摸几题，也压着本轮上限
  if(b-2>=1 && (s.asked[b-2]||0)<3) return b-2;          // 小朋友年龄小，再往下垫一关
  return 0;
}
/* 一组题打完后的判级：过关往上、没过往下（这就是"答错不结束、回头再测"的来源） */

function stairDecide(s){
  var c=s.curLevel, aced=(s.blockCorrect>=BLOCK), pass=(s.blockCorrect>=PASS_NEED);
  s.blockAsked=0; s.blockCorrect=0;
  var dir=pass?1:-1;
  if(dir!==s.lastDir) s.reversals++;      // 折返次数 = 边界已经被夹住几次
  s.lastDir=dir;

  if(pass){
    s.floorFails=0;
    // 一组全对说明这一关太轻松，直接往上跳两关：题量省下来，
    // 也更容易摸到高难度那几关（不然题量上限一到就停在半路，估算只能靠外推）。
    // 两个限制：① 前两轮不跳（priorRounds<2），逐关爬、简单居多，第三轮起才跳；
    // ② 只在低分段跳（落点不超过第 6 关）——再往上每段的字数大，
    // 跳过去留空档就等于零证据白给分（"全对就 5000"的一条根因）
    var jump=(aced&&c+2<=LEVELS.length-2&&s.priorRounds>=2)?2:1, next=c+jump;
    if(next>LEVELS.length) next=LEVELS.length;
    if(next>s.lvCap) next=s.lvCap;   /* 本轮的关卡上限 */
    if(next===c){
      /* 已经站在最高关、又过关了：不再往上跳，直接转回头复核。
         这里不能顺手判成"测到顶"——一组两题只对一题也算过关（PASS_NEED=1），
         那只是分界压在最高关，不等于他真的认识这 5000 个字。
         "测到顶"由 computeResult 按"一道没错 + 最高关全对"来认定。 */
      s.curLevel=c;
      s.phase='topup'; s.topupCount=0; s.boundary=findBoundary(s);
      return;
    }
    s.curLevel=next;
  }else{
    if(c<=1){
      s.curLevel=1;
      // 连最低关都两个回合没过：确实到底了，别再耗着他
      s.floorFails=(s.floorFails||0)+1;
      if(s.floorFails>=2){ s.stopReason='floor'; s.phase='topup'; s.topupCount=0; s.boundary=findBoundary(s); return; }
    }else{
      s.curLevel=c-1;
    }
  }
  // 已经一上一下折返过、且题量够了 → 分界夹住，转入回头复核
  if(s.reversals>=REV_NEED && s.count>=STAIR_MIN_Q && s.phase==='stair'){
    s.phase='topup'; s.topupCount=0; s.boundary=findBoundary(s);
  }
}
/* =========================================================================
   句子认读模式：选句 + 结算
   选句原则——围着"分界"选：优先挑包含最多"还没测过、且难度贴近分界"的字的句子。
   一次读一句就能拿到十几个字的证据，比一句一题快十几倍。
   已经测过的字再次出现，价值打折，避免一句话里反复浪费在同一个字上。
   ========================================================================= */

function sentTarget(s){
  /* 锚定选句：主要读"锚"这一级的句子，每 3 句穿插 1 句高一级的抽查。
     和单字玩法同一个节奏——先低级、偶尔穿插，认识高级也不往上跳 */
  var a=(s.anchor||1);
  if(s.sentCount<SENT_WARM) return Math.max(1,a-1);
  if(s.sentCount%3===2) return Math.min(a+1, LEVELS.length);
  return a;
}

function pickSentence(s){
  var target=sentTarget(s);
  var best=null, bestScore=-1e9;
  for(var i=0;i<SENTENCES.length;i++){
    if(s.used[i]) continue;
    var sen=SENTENCES[i], score=0;
    for(var k=0;k<sen.uniq.length;k++){
      var c=sen.uniq[k], L=LEVEL_OF[c]||1;
      score += s.seen[c] ? SENT_SKIP : Math.max(0, 6-1.6*Math.abs(L-target));
    }
    score = score/Math.sqrt(sen.uniq.length) + Math.random()*0.5;
    if(score>bestScore){ bestScore=score; best=i; }
  }
  return (best===null)?null:best;
}

function nextSentence(s){
  if(s.sentCount>=(s.sentCap||SENT_MAX)){ s.stopReason='limit'; s.done=true; return null; }
  // 连最难的十星字都认下来了，再读下去也没多少新信息，早点收工
  var top=LEVELS.length;
  if(s.sentCount>=SENT_CEIL && (s.asked[top]||0)>=3 && (rateAt(s,top)||0)>=0.5){
    s.stopReason='ceiling'; s.done=true; return null;
  }
  var idx=pickSentence(s);
  if(idx===null){ s.stopReason='covered'; s.done=true; return null; }
  s.used[idx]=1;
  s.curSentence=SENTENCES[idx];
  s.marks={};
  return {level:s.curSentence.lv, ch:s.curSentence.t, sentence:true, sen:s.curSentence};
}
/* 一句读完：谁没认出来，家长就在 marks 里标一下（句内同一个字只算一次） */

function submitSentence(s,marks){
  if(!s.curSentence) return null;
  var sen=s.curSentence, marked=0, known=0, fresh=0;
  for(var k=0;k<sen.uniq.length;k++){
    var c=sen.uniq[k];
    if(s.seen[c]){
      /* 这个字前面的句子判过了。当时没标（记了认识）、这次家长标了红：
         把之前那条记录翻转成"不认识"——不然红点了个寂寞，字库里还躺在
         "认识"里（2026-10-10 家长反馈"点不认识也会进认识的字"） */
      if(marks&&marks[c]){
        for(var a2=s.answers.length-1;a2>=0;a2--){
          if(s.answers[a2].ch===c && s.answers[a2].correct){
            s.answers[a2].correct=false;
            var L2=s.answers[a2].level;
            s.correct[L2]=Math.max(0,(s.correct[L2]||1)-1);
            s.stars=Math.max(0,(s.stars||1)-1);
            break;
          }
        }
      }
      continue;
    }
    s.seen[c]=1;
    var L=LEVEL_OF[c]||1;
    s.asked[L]=(s.asked[L]||0)+1;
    s.count++; fresh++;
    if(marks&&marks[c]){ marked++; s.answers.push({level:L, ch:c, correct:false}); }
    else { known++; s.correct[L]=(s.correct[L]||0)+1; s.answers.push({level:L, ch:c, correct:true}); }
  }
  s.stars+=known;
  s.sentCount++;
  s.curSentence=null; s.marks={};
  return {marked:marked, known:known, fresh:fresh, sen:sen};
}
/* 家长想提前结束：把当前这句也算进去（标了的按不认识算） */

function sentenceSeenCount(s){ return s.count||0; }

function nextQuestion(s){
  if(s.done) return null;
  if(s.mode==='sentence') return nextSentence(s);
  if(s.count>=(s.cap||MAX_Q)){ s.stopReason='limit'; s.done=true; return null; }

  /* 锚定出题：主测锚这一级；每 4 题穿插 1 题高两级（抽查）、1 题低一级（回顾）。
     抽查对了也不升级——升级只发生在轮与轮之间（anchorAfter，每轮最多 +1） */
  var i=s.count, a=s.anchor||1, lv=a;
  if(i%4===3) lv=Math.min(a+2, LEVELS.length);
  else if(i%4===2 && a>1) lv=a-1;
  if(!s.asked[lv]){ s.asked[lv]=0; s.correct[lv]=0; }
  s.q=makeQuestion(s,lv);
  return s.q;
}

/* 轮与轮之间的锚定调整：锚这一级表现好（≥70%）→ 下轮 +1（最多）；
   明显吃力（<30%）→ 退 1 级；抽查题不影响升降——认识高级也不跳 */
function anchorAfter(s){
  var a=s.anchor||1;
  var n=(s.asked&&s.asked[a])||0, k=(s.correct&&s.correct[a])||0;
  var rate=(n>=2)?(k/n):((s.count>=5)?(s.stars/s.count):1);
  if(rate>=0.7) return Math.min(LEVELS.length, a+1);
  if(rate<0.3) return Math.max(1, a-1);
  return a;
}

function answerQuestion(s,correct){
  if(!s.q) return null;
  var q=s.q, lv=q.level;
  s.count++;
  s.answers.push({level:lv, ch:q.ch, correct:!!correct});
  s.asked[lv]=(s.asked[lv]||0)+1;
  if(correct){ s.correct[lv]=(s.correct[lv]||0)+1; s.stars++; }

  s.q=null;
  return {level:lv, correct:!!correct, ch:q.ch};
}
/* 把各难度段的实测认识率整理成点列（听音模式先去猜测校正）：
   {i:第几关, n:出了几题, k:答对几题, p:校正后的认识率, se:抽样标准误}
   先验（前面几轮攒下的证据）会先并进来，见 SECTION: PRIOR。
   估算怎么用这些点见 SECTION: ESTIMATE。 */

var BOOT_N=60, BOOT_SEED_FLOOR=0.08;

function randn(){ return (Math.random()+Math.random()+Math.random()+Math.random()-2)*1.732; }

function pointsOf(s){
  var guess=(s.mode==='listen')?0.25:0;
  var mc=priorMerge(s);          // 先验 + 本轮实测（见 SECTION: PRIOR）
  var pts=[];
  for(var i=1;i<=LEVELS.length;i++){
    var n=mc.asked[i]||0, k=mc.correct[i]||0;
    if(!n) continue;
    var pr=clamp(k/n,BOOT_SEED_FLOOR,1-BOOT_SEED_FLOOR);
    pts.push({i:i, n:n, k:k,
              p:clamp((k/n-guess)/(1-guess),0,1),
              se:Math.sqrt(pr*(1-pr)/n)/(1-guess)});
  }
  return pts;
}

/* =========================================================================
   SECTION: ESTIMATE — 识字量怎么算（家长口径，2026-10 定）

   字表分成 LEVELS.length 个难度段，每段有自己的字数。算总数就一句话：
   **只按真正出过题的段、按"答对÷出了几题"的比例折算**。

     1) 测过的段：这一段一共 size 个字，出了 n 题答对 k 题，
        就记 (k/n) × size 个字。例：段里 100 字、出 10 题对 3 题 → 30 字。
     2) 实测范围之内、这一轮没出到题的段：认识率随难度单调下降，
        所以它的真值一定夹在两边已测段之间 —— 取小的那个（宁少不多）。
        这不算外推，是被数据夹住的。
     3) 实测范围之上的段：**不给分**。以前这里是"用拟合曲线补齐"，
        而逻辑拟合在"证据全是答对"时是不可辨识的：只答对两三题也能把
        曲线中心推到实测范围之外，让上面每一关都算成"几乎全认识"，
        总数直接贴到 5000。（2026-10 家长三次反馈的就是这个。）
     4) 区间的上沿单独补一点余地：实测范围之上的段按"最靠上那一关的比率、
        每远一关打 EXTRAP_DECAY 折"粗估一个上限 —— 只用来回答
        "最多可能到多少"，不进点估计。

   代价（模拟标定 /tmp/mp/bench7.js）：一轮 12 题最多覆盖六关左右，
   范围之上的段不给分，所以大孩子会被算低（真值 1500 及以上偏低一到三成）。
   但这个偏差方向是"只少不多"，结果页按"至少 N 字"的口径说明；
   多玩两轮覆盖更全，数字自己会往上走（跨轮累积见 SECTION: PRIOR）。
   反过来，只要孩子真的闯到了最高关，十段全被覆盖，总数自然就是 5000。
   ========================================================================= */

/* 实测范围之上每远一关打几折（只用于区间上沿，跑模拟标定的 /tmp/mp/bench7.js） */
var EXTRAP_DECAY=0.6;

/* =========================================================================
   样本门槛 MIN_TESTED —— 测得太少就不给分数

   只答对两三道题，就算按上面的口径"只折算测到的段"，算出来的也只是
   "这两题所在的段除以题数"——数字本身没有意义（会小得离谱）。
   所以定一个下限：**累计测满 MIN_TESTED 个字才出分数**，不够就在结果页
   明说"还需要再多答几道题"，不显示任何数字。

   一轮十来题、句子一句覆盖好几个字，所以：
     · 读句子：一轮通常就能测到 40 个字上下 → 直接出分数
     · 读一读/找一找：一轮 12 题 = 12 个字 → 第一轮不够，**第二轮累积起来就够**
       （跨轮累积见 SECTION: PRIOR，`tested` 字段记的就是累计测过多少字）
     · 全对的孩子也一样卡这条线：全对恰恰说明还没摸到他"认不出"的那条线，
       更该多答几道；答满 MIN_TESTED 个字还是全对，才轮到"至少 5000"这个口径
   ========================================================================= */

var MIN_TESTED=20;

/* 累计测到多少个字 = 本轮 + 前面几轮（前面几轮记在先验的 tested 里） */
function testedTotal(s){
  return (s.count||0) + ((s.prior&&s.prior.tested)||0);
}

/* 一轮的额度用完了、但样本还不够：接着再答几道（不重开一轮、先验不动）。
   —— 把上限抬高，同时把"回头复核"的额度也放开一点，
      否则引擎会因为"该补的都补完了"立刻再次收工，一道题都出不来。 */
var EXTEND_N=8;
function extendSession(s, extra){
  if(!s) return s;
  extra=extra||EXTEND_N;
  if(s.mode==='sentence'){
    s.sentCap=(s.sentCap||SENT_MAX)+Math.max(1,Math.ceil(extra/6));  /* 一句能盖好几个字 */
  }else{
    s.cap=(s.cap||MAX_Q)+extra;
    s.topupBoost=(s.topupBoost||0)+2;
    /* 复核额度直接放开到整轮上限（整轮反正已经被 cap 卡住了）：
       不然引擎会因为"该补的都补完了"立刻再次收工，一道题都出不来 */
    s.topupBudget=s.cap;
    if(s.phase==='warmup'){ s.phase='stair'; s.blockAsked=0; s.blockCorrect=0; }
  }
  s.done=false;
  s.stopReason='';
  return s;
}

/* 实测范围之内、但这一轮没出到题的段：取两边已测段里小的那个 */
function innerRate(m, pts){
  var lo=null, hi=null;
  for(var t=0;t<pts.length;t++){
    var i=pts[t].i;
    if(i<m && (!lo || i>lo.i)) lo=pts[t];
    if(i>m && (!hi || i<hi.i)) hi=pts[t];
  }
  if(lo&&hi) return Math.min(lo.p, hi.p);
  return 0;        /* 出到实测范围之外了 → 不给分 */
}
/* 点估计 = Σ（每段认识率 × 该段字数） */
function totalOf(pts){
  var map={}, t;
  for(t=0;t<pts.length;t++) map[pts[t].i]=pts[t];
  var sum=0;
  for(var m=1;m<=LEVELS.length;m++){
    var pt=map[m];
    sum += (pt?pt.p:innerRate(m, pts))*LEVELS[m-1].size;
  }
  return sum;
}
/* 区间上沿额外允许的量：实测范围之上的段，按最靠上那一关的比率打折估个上限 */
function outerAllowance(pts){
  var hi=0, bi=0, base=0, t;
  for(t=0;t<pts.length;t++) if(pts[t].i>hi) hi=pts[t].i;
  if(!hi) return 0;
  for(t=0;t<pts.length;t++) if(pts[t].i>bi && pts[t].i<=hi){ bi=pts[t].i; base=pts[t].p; }
  var sum=0;
  for(var m=hi+1;m<=LEVELS.length;m++){
    sum += base*Math.pow(EXTRAP_DECAY, m-hi)*LEVELS[m-1].size;
  }
  return sum;
}

/* 区间的算法（参数自助法）：
   把每个已测段的实测认识率按它的抽样标准差随机抖一下，重新求和，
   重复几十次后取 10% 和 90% 分位。抖动只作用于实测段，未测段那部分
   按上面的上限一并计入（extra），所以区间会同时体现"抽样抖动"和
   "上面那几关到底有没有字"这两层不确定。 */
function bootstrapInterval(pts, extra){
  if(!pts.length) return [0,0];
  extra=extra||0;
  var totals=[];
  for(var r=0;r<BOOT_N;r++){
    var pert=[];
    for(var t=0;t<pts.length;t++){
      var p=pts[t];
      pert.push({i:p.i, n:p.n, p:clamp(p.p+randn()*p.se,0,1)});
    }
    totals.push(totalOf(pert)+extra);
  }
  totals.sort(function(a,b){return a-b;});
  function q(f){ return totals[clamp(Math.round(f*(BOOT_N-1)),0,BOOT_N-1)]; }
  return [q(0.10), q(0.90)];
}

function computeResult(s){
  var guess=(s.mode==='listen')?0.25:0;
  var wrong=[], misses=0;
  s.answers.forEach(function(a){
    if(!a.correct){ misses++; if(wrong.indexOf(a.ch)<0) wrong.push(a.ch); }
  });
  /* 没摸到"认不出的那条线"（allOk）→ 数字只能按下限口径给：
     每个已测段按 Wilson 一侧80%置信下限折算（测2题的段只按约55%、5题约79%），
     没出题的空档段按两边下限里小的补。这跟自适应测试（CAT）的惯例一致：
     能力超出题库范围时不给点估计，只报"至少 X"。
     判据是"分界露出来没有"（没有任何一段的合并认识率低于 50%），不是"一道没错"——
     2026-10-10 家长实测：只错一道（哪怕错在热身的一星字）就整场退回原始比例，
     2题/段照样按100%折，20个字能报到4000+。分界一露（正常孩子）就走
     原来标定过的算法（±3%），一个字不变 */
  var pts=pointsOf(s);
  var noBnd=(pts.length>0);
  for(var t0=0;t0<pts.length;t0++){ if(pts[t0].p<0.5){ noBnd=false; break; } }
  var allOk=(misses===0 && s.count>0) || noBnd;
  if(allOk){
    var cpts=[];
    for(var t0=0;t0<pts.length;t0++){
      var p0=pts[t0];
      cpts.push({i:p0.i, n:p0.n, k:p0.k, p:wilson(p0.k,p0.n,1.28)[0], se:p0.se});
    }
    pts=cpts;
  }
  var map={};
  for(var t=0;t<pts.length;t++) map[pts[t].i]=pts[t];
  var allow=outerAllowance(pts);   // 实测范围之上的上限补偿，只进区间上沿
  var est=0, levels=[];
  for(var m=1;m<=LEVELS.length;m++){
    var size=LEVELS[m-1].size;
    var pt=map[m];
    var n=pt?pt.n:0, k=pt?pt.k:0;
    /* 测过的段 → 实测比例（全对轮按置信下限）；范围内的空段 → 两边夹小的那个；范围之上 → 0 */
    var pc=pt?(allOk?pt.p:clamp((k/n-guess)/(1-guess),0,1)):innerRate(m, pts);
    est+=pc*size;
    levels.push({i:m, size:size, stars:LEVELS[m-1].stars, name:LEVELS[m-1].name, color:LEVELS[m-1].color,
                 asked:n, correct:k, p:n?k/n:0, pc:pc});
  }
  // 区间：参数自助法 + 未测段的上限补偿（见 SECTION: ESTIMATE）
  var iv=bootstrapInterval(pts, allow);
  var lo=iv[0], hi=iv[1];
  // 自助法只反映"抽样带来的抖动"，反映不了"范围内那几个空段插得对不对"。
  // 单字玩法一轮只覆盖五六关、更依赖插值，这层余量留大一点（数值是跑模拟标定的）。
  var pad=Math.round(est*((s.mode==='sentence')?0.02:0.06));
  lo-=pad; hi+=pad;
  var starLevel=0;
  for(var q2=0;q2<levels.length;q2++){ if(levels[q2].asked>0 && levels[q2].pc>=0.5) starLevel=levels[q2].i; }
  var est10=Math.round(est/10)*10;
  /* 护栏（2026-10-10 家长定的规矩：答题轮数少，预估的字数就不能多）：
     数字上限 = 累计已测字数 × 100。两轮读一读共 20 字 → 最多报 2000；
     读句子一轮 50 字 → 上限 5000（等于不卡）。多玩几轮上限自动放开，
     方向宁少不多，和「至少」口径一致 */
  var estCap=Math.min(5000, testedTotal(s)*100);
  if(est10>estCap) est10=Math.floor(estCap/10)*10;
  var lo10=Math.round(lo/10)*10, hi10=Math.round(hi/10)*10;
  // 至少给一点宽度，别让区间看起来像精确值
  if(hi10<est10+80) hi10=est10+80;
  if(lo10>est10-80) lo10=Math.max(0,est10-80);
  /* 一道都没答错 → 说明一路过关斩将爬到了顶端。但"本轮全对"不等于"爬到顶"：
     一轮只出 10 题左右，题量一到就停了，这时候上面那几关根本还没测过，
     不能说成"至少 5000"。所以必须真的测到最高关、且最高关也全对，才算测到顶。 */
  var topLv=LEVELS.length, topAsked=s.asked[topLv]||0;
  var topAced=(topAsked>0 && (s.correct[topLv]||0)>=topAsked);
  var topOut=(misses===0 && s.count>0 && topAced);
  /* 样本够不够：累计测满 MIN_TESTED 个字才给分数，一视同仁。
     以前"全对闯到最高关"是例外——后来发现不对：12 题全对靠跳两关就能摸到
     第 10 关，每关才 2 题，这时候报"至少 5000"证据太薄了（2026-10 家长实测
     反馈的正是这个）。全对的孩子更该多答几道把证据坐实，答完照样是"至少"。 */
  var testedN=testedTotal(s);
  var enough=(testedN>=MIN_TESTED);
  return {
    est:est10, lo:Math.min(lo10,est10), hi:Math.min(5000,Math.max(hi10,est10)),
    starLevel:starLevel, levels:levels, wrong:wrong,
    count:s.count, askedTotal:s.count, correctTotal:s.stars,
    stopReason:s.stopReason, mode:s.mode, sentCount:s.sentCount||0,
    distinct:s.count, misses:misses, topOut:topOut, allOk:allOk,
    /* 跨轮累积的口径：这一轮做了多少、之前累计了多少、这是第几轮 */
    sessCount:s.count, priorN:s.priorN||0, totalN:s.count+(s.priorN||0),
    rounds:(s.priorRounds||0)+1, topTested:topAced,
    /* 样本门槛：测了多少字、够不够给分数、还差几个 */
    testedN:testedN, minTested:MIN_TESTED, enough:enough, needN:Math.max(0,MIN_TESTED-testedN)
  };
}

/* =========================================================================
   SECTION: STORAGE
   ========================================================================= */

function todayStr(){
  var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

/* =========================================================================
   SECTION: AUDIO — 全部用 WebAudio 现场合成，不依赖任何外部文件
   ========================================================================= */

var PANDA_PARTS=[
  /* 身体是保底零件（at:0，跟头一样一直都在）：进度清零/新小朋友时
     右下角也是一个完整的头+身体小豆豆，不再是孤零零一个头
     （2026-10-10 家长反馈"答题界面没有熊猫"，其实是 0 进度只剩头） */
  {id:'body',   name:'身体',   emoji:'🧍', at:0,   tip:'豆豆长出身体啦！'},
  {id:'armL',   name:'左手',   emoji:'🤚', at:24,  tip:'豆豆有左手了，可以抱你一下！'},
  {id:'armR',   name:'右手',   emoji:'✋', at:40,  tip:'豆豆有两只手啦！'},
  {id:'legL',   name:'左脚',   emoji:'🦶', at:58,  tip:'豆豆有脚了，能站起来啦！'},
  {id:'legR',   name:'右脚',   emoji:'🦶', at:78,  tip:'豆豆会走路啦！'},
  {id:'tail',   name:'小尾巴', emoji:'☁️', at:100, tip:'豆豆长出小尾巴啦！点一下豆豆，转过去看看～'},
  {id:'shirt',  name:'小衣服', emoji:'👕', at:130, tip:'豆豆穿上新衣服啦！'},
  {id:'scarf',  name:'围巾',   emoji:'🧣', at:165, tip:'豆豆围上了暖暖的围巾！'},
  {id:'hat',    name:'小帽子', emoji:'🧢', at:205, tip:'豆豆戴上帽子，好神气！'},
  {id:'glasses',name:'眼镜',   emoji:'👓', at:250, tip:'豆豆戴上眼镜，像个小博士！'},
  {id:'bag',    name:'小书包', emoji:'🎒', at:300, tip:'豆豆背上小书包，要去上学啦！'},
  {id:'crown',  name:'小皇冠', emoji:'👑', at:360, tip:'豆豆戴上皇冠，你就是识字小勇士！'},
  /* —— 冬天的装备（跳跳的点子：天冷了要有毛线帽、手套、雪地靴） —— */
  {id:'knitHat',name:'毛线帽', emoji:'🧶', at:400, tip:'豆豆戴上毛线帽，耳朵一下就暖和啦！', winter:1},
  {id:'mitten', name:'小手套', emoji:'🧤', at:470, tip:'豆豆戴上小手套，手不冷啦！', winter:1},
  {id:'earmuff',name:'耳罩',   emoji:'🎧', at:540, tip:'豆豆戴上了耳罩，暖烘烘！', winter:1},
  {id:'boots',  name:'雪地靴', emoji:'🥾', at:610, tip:'豆豆穿上雪地靴，可以去踩雪啦！', winter:1},
  {id:'coat',   name:'小棉袄', emoji:'🧥', at:690, tip:'豆豆穿上小棉袄，冬天也不怕冷！', winter:1}
];

function pandaUnlocked(total){
  var out=[];
  for(var i=0;i<PANDA_PARTS.length;i++){ if(total>=PANDA_PARTS[i].at) out.push(PANDA_PARTS[i].id); }
  return out;
}
/* 下一个还没拿到的零件（全都拿到了返回 null） */

function pandaNext(total){
  for(var i=0;i<PANDA_PARTS.length;i++){ if(total<PANDA_PARTS[i].at) return PANDA_PARTS[i]; }
  return null;
}
/* 本次认对了 n 个字：写回累计值，返回这次新长出来的零件列表 */

/* 记一笔：在 before 的基础上增加 n 个字，返回 {after, fresh}
   fresh = 这一笔新解锁的零件 id 数组。
   小程序版改成纯函数（不直接读写存储），由调用方决定何时落盘。 */
function pandaEarn(before, n){
  before=before|0; n=n|0;
  if(n<=0) return {after:before, fresh:[]};
  var after=before+n;
  var a=pandaUnlocked(before), b=pandaUnlocked(after), fresh=[];
  for(var i=0;i<b.length;i++){ if(a.indexOf(b[i])<0) fresh.push(b[i]); }
  return {after:after, fresh:fresh};
}

var SCENES=[
  {id:'spring', name:'春天的小花园',   short:'春 · 花园', emoji:'🌸', at:0,   color:'#ffd15c',
   tip:'豆豆住在春天的小花园里，遍地是小花 🌸'},
  {id:'summer', name:'夏天的海边',     short:'夏 · 海边', emoji:'🏖️', at:150, color:'#5cb8ff',
   tip:'豆豆搬去夏天的海边住啦，能听见海浪声 🏖️'},
  {id:'autumn', name:'秋天的田野',     short:'秋 · 田野', emoji:'🍂', at:320, color:'#ff9f43',
   tip:'豆豆走进秋天的田野，落叶飘啊飘 🍂'},
  {id:'winter', name:'冬天的冰天雪地', short:'冬 · 雪地', emoji:'❄️', at:450, color:'#7fc4ff',
   tip:'下雪啦！豆豆搬进了冰天雪地，快看窗外 ❄️'}
];

function sceneUnlocked(total){
  var out=[];
  for(var i=0;i<SCENES.length;i++){ if(total>=SCENES[i].at) out.push(SCENES[i]); }
  return out.length?out:[SCENES[0]];
}

function sceneCur(total){ var u=sceneUnlocked(total); return u[u.length-1]; }

function sceneNext(total){
  for(var i=0;i<SCENES.length;i++){ if(total<SCENES[i].at) return SCENES[i]; }
  return null;
}

/* —— 四季场景的背景画（viewBox 400x260，豆豆站在 y≈210 的地面上） —— */

var CHEER=['太棒了！','真厉害！','好眼力！','这个字难不倒你！','超级棒！','你认识好多字呀！','哇，又对了！'];

var SOFT=['没关系，这个字有点难','这个是新朋友，下次就认识啦','再看看哦，不着急','嗯，我们跳过它'];

var PRAISE_END=['你坚持到底啦，真了不起！','今天的闯关全部完成！','豆豆给你鼓掌！'];

function modeName(m){
  return m==='read' ? '读一读' : (m==='sentence' ? '读句子' : '找一找');
}

/* 进度条 = 答题完成度（已做 ÷ 这一轮的上限）。
   以前画的是"难度进程"（爬到第几关、复核到第几题）：难度回落时条会往回缩，
   起测关高时条一开始就很长——家长看着就是"答得多条反而短"（2026-10-10 真机反馈）。
   现在的阶段信息（正在挑战/回头复核）文字行里本来就有，条只管进度 */
function levelProgress(s){
  if(s.mode==='sentence') return clamp(s.sentCount/(s.sentCap||SENT_MAX),0.02,0.97);
  return clamp(s.count/(s.cap||MAX_Q),0.02,0.97);
}

/* 星级 = 按累计认识字数的闯关进度（实测口径，2026-10-10 定）：
   认识满前面各级的容量（60/120/180/…）就点亮那颗星，跟主数字同一个口径。
   以前星级是"认识率≥50% 的最高段"——只测 4 个字碰巧全对也能点亮四星，
   家长看着"才认识 4 个字就四星"很困惑 */
function levelFromKnown(n){
  var lv=0, acc=0;
  for(var i=0;i<LEVELS.length;i++){ acc+=LEVELS[i].size; if((n||0)>=acc) lv=i+1; else break; }
  return lv;
}

/* ---- 导出 ---- */
module.exports = { LEVELS, AGE_REF, SENTENCE_TEXT, LEVEL_OF, NOT_SCORED, SENTENCES, EXTRAP_DECAY, MIN_TESTED, EXTEND_N, WARM_N, BLOCK, PASS_NEED, TOPN, MAX_Q, SENT_WARM, SENT_MAX, SENT_CEIL, SENT_SKIP, REV_NEED, EARN_RATE, DECAY, PRIOR_CAP, shuffle, clamp, wilson, newSession, pickChar, makeQuestion, rateAt, boundaryOfCounts, findBoundary, topupNext, stairDecide, sentTarget, pickSentence, nextSentence, submitSentence, sentenceSeenCount, nextQuestion, answerQuestion, priorCount, priorTrim, priorMerge, priorNext, testedTotal, extendSession, BOOT_N, randn, pointsOf, totalOf, innerRate, outerAllowance, bootstrapInterval, computeResult, todayStr, PANDA_PARTS, pandaUnlocked, pandaNext, pandaEarn, SCENES, sceneUnlocked, sceneCur, sceneNext, CHEER, SOFT, PRAISE_END, modeName, levelProgress, levelFromKnown, anchorAfter };
