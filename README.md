# FuckACE
## FuckACE是一个用来优化所有使用ACE的游戏的免费开源免安装工具，可以全自动限制ACE占用，以降低ACE对电脑的性能影响。
### 喜欢的话请点点star，谢谢！Ciallo～(∠・ω<)⌒☆

最新版本下载：
- [迅雷下载](https://pan.xunlei.com/s/VOlRy4qvhrn151DGQ_Y4AUrxA1?pwd=udua#)
- [夸克下载](https://pan.quark.cn/s/e8924b638b81)
- [Github下载](https://github.com/shshouse/FuckACE/releases)
  
相关使用教程请看B站视频：
- [FuckACE使用教程](https://www.bilibili.com/video/BV1ePCnBpEWp/)

反馈问题，或者有什么建议都可以说喵＞﹏＜
- [提出建议！](https://github.com/shshouse/FuckACE/issues/new)

<img width="1350" height="1200" alt="image" src="https://github.com/user-attachments/assets/72702cfd-728c-483a-939b-c86d894c0eb4" />

## 注意事项：
### 1.对于ACE
- FuckACE不会关闭ACE，只是对其占用进行限制，别开挂嗷。
### 2.会不会封号
- FuckACE虽然名字很糙，但是并不会做出任何修改游戏文件、读写游戏内存等任何危害游戏本体的行为，对ACE进程的限制也仅限于调整ACE进程的系统资源分配属性，以及通过Windows注册表预设进程优先级，但是TX是自由的，在使用时请低调，不要跳脸官方。
- 经过小半年的主包自己测试和大家的反馈，目前可以大致认为FuckACE不会导致账号封禁。但是不排除会误封的可能，请充分了解潜在风险，使用即代表已经了解并接受这些风险/(ㄒoㄒ)/~~


## 核心机制
### 1.被动限制：
通过注册表修改，一键降低ACE的CPU优先级和I/O优先级，同时提高对应游戏优先级。

### 2.主动限制：
在主动限制下，可以额外对ACE进行限制：<br>
1.绑定到最后一个核心(一般是小核)<br>
2.将ACE设置为效率模式(减低占用)<br>
3.降低ACE的内存优先性<br>

将被执行限制的进程：<br>
1.SGuard64.exe <br>
2.SGuardSvc64.exe <br>

## 开发者
- 开发者: [shshouse](https://github.com/shshouse)
- Bilibili: [松灰酸的猫](https://space.bilibili.com/3493127123897196)
- 爱发电: [松灰酸](https://afdian.com/a/shshouse)

## 免责声明

本软件（FuckACE）是一个开源的系统资源调度优化工具，基于 GPLv3 协议发布。在使用前请仔细阅读以下声明：

### 软件性质 ヽ(✿ﾟ▽ﾟ)ノ
- 本软件**不是**游戏作弊工具、外挂或辅助程序。
- 本软件不会读写游戏内存、不会修改游戏文件、不会注入 DLL、不会 Hook 任何游戏函数。
- 本软件所有操作均通过 Windows 公开系统 API（如 SetProcessAffinityMask、SetPriorityClass、SetProcessInformation 等）和 Windows 注册表（Image File Execution Options）实现，与系统自带的任务管理器调整进程优先级和 CPU 亲和性的原理一致。
- 本软件完全开源，源代码公开透明，不含任何后门，不收集任何用户数据。

### 风险告知 Σ(っ °Д °;)っ
- 使用本软件调整反作弊进程的系统资源分配**可能违反**相关游戏的用户协议（EULA）。
- 虽然经主包测试暂未封号，但**不排除**因使用本软件导致游戏账号被封禁的可能性。
- 使用本软件即表示您已充分了解并自愿接受上述风险。

### 责任免除 ┭┮﹏┭┮
- 本软件仅供技术研究和学习交流使用。
- 因使用本软件造成的任何直接或间接后果（包括但不限于游戏账号封禁、系统异常等），均由使用者自行承担，与开发者无关。
- 开发者不对本软件的适用性、安全性或可靠性作任何明示或暗示的担保。
- 任何人不得将本软件用于违反法律法规的用途。
