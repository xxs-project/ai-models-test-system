from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
import logging
import json
from models import Device, Task

logger = logging.getLogger(__name__)

class ResourceManager:
    """
    资源管理器
    
    负责：
    1. 检查设备资源是否满足任务需求
    2. 维护设备任务下发冷却时间
    3. 检查任务拓扑约束
    4. 检查框架独占约束
    """
    
    # 推理框架常量
    FRAMEWORK_VLLM = 1
    FRAMEWORK_MINDIE = 2
    
    # 测试模式常量
    MODE_SINGLE = 1
    MODE_ALL = 2
    
    def __init__(self):
        # 记录设备最后一次任务下发时间
        # key: device_id, value: datetime
        self._device_last_dispatch: Dict[int, datetime] = {}
        
    def can_execute(self, task: Dict[str, Any], device: Device, running_tasks: List[Any]) -> tuple[bool, str]:
        """
        判断任务是否可以在设备上执行
        
        Args:
            task: 任务字典/对象
            device: 设备对象
            running_tasks: 当前正在运行的任务列表
            
        Returns:
            Tuple[bool, str]: (是否可执行, 原因)
        """
        device_id = device.id
        if device_id is None:
            return False, "设备ID无效"
        
        # 1. 提取当前设备上的运行任务
        device_running_tasks = []
        for t in running_tasks:
            t_dev_id = getattr(t, 'device_id', None)
            if t_dev_id is None and isinstance(t, dict):
                t_dev_id = t.get('device_id')
            
            if t_dev_id == device_id:
                device_running_tasks.append(t)

        # 2. 检查冷却时间 (Req 3)
        # 强制执行冷却时间检查，确保两次任务下发间隔至少5分钟
        if not self._check_cooldown(device_id):
            return False, f"设备 {device_id} 处于冷却期"
            
        # 3. 检查MindIE独占约束 (Req 5)
        inference_framework = task.get('inference_framework')
        if inference_framework == self.FRAMEWORK_MINDIE:
            if device_running_tasks:
                return False, "MindIE任务需要独占设备，当前有任务在运行"
        
        # 4. 检查资源满足情况 (Req 2 & 4)
        success, reason = self._check_resources(task, device)
        if not success:
            return False, reason
            
        return True, "资源满足"

    def record_dispatch(self, device_id: int):
        """记录任务下发时间"""
        self._device_last_dispatch[device_id] = datetime.now()
        
    def _check_cooldown(self, device_id: int) -> bool:
        """检查冷却时间"""
        last_time = self._device_last_dispatch.get(device_id)
        if not last_time:
            return True
            
        elapsed = datetime.now() - last_time
        if elapsed < timedelta(minutes=5):
            return False
        return True
        
    def _check_resources(self, task: Dict[str, Any], device: Device) -> tuple[bool, str]:
        """检查资源约束"""
        required_count = task.get('npu_count', 1)
        test_mode = task.get('test_mode', self.MODE_SINGLE)
        
        # 解析设备空闲卡
        idle_cards = self._get_idle_cards(device)
        idle_count = len(idle_cards)
        
        # Req 2: 检查卡数是否满足
        if idle_count < required_count:
            return False, f"设备空闲卡数不足 (需要 {required_count}, 当前 {idle_count})"
            
        # Req 4: 拓扑检查
        # (1) 单模型测试
        if test_mode == self.MODE_SINGLE:
            if required_count in [2, 4, 8]:
                if not self._check_topology(idle_cards, required_count):
                    return False, "空闲卡拓扑不满足要求 (跨越前8/后8卡组合)"
                    
        # (2) 全套模型测试
        elif test_mode == self.MODE_ALL:
            # "设备至少需要空闲4张卡"
            if idle_count < 4:
                return False, f"全套模型测试需要至少4张空闲卡 (当前 {idle_count})"
                
            # "设备空闲4张卡、8张卡时...查看是否前8卡和后8卡的组合"
            # 这里理解为：如果我们将使用4或8张卡，必须满足拓扑。
            # 由于全套模型通常会跑各种配置，我们应该确保我们能找到至少一组满足最大需求的拓扑？
            # 需求说 "设备空闲4张卡、8张卡时，需要查看..."
            # 假设全套测试最大可能用到8卡。
            # 如果当前只有4张卡空闲，且是 0,1,2,9 -> 不满足。
            # 逻辑：检查是否存在 isValidTopology(idle_cards_subset)
            
            # 简化逻辑：检查所有空闲卡是否跨越了 0-7 和 8-15 的边界
            # 或者是：只要能找到一组符合要求的子集即可？
            # 需求原文："如果出现则认为不满足要求，任务等待" -> 这是一个否定条件。
            # "查看设备空闲卡是否前8卡和后8卡的组合...如果出现则认为不满足"
            # 这听起来像是：只要空闲卡集合 *包含* 了跨组的卡，就不行？这太严格了。
            # 比如 0-7 空闲，8 也空闲。总共9张。这是 "前8卡和后8卡的组合"。难道不能跑？
            # 应该是指：对于所需资源的分配，不能跨组。
            # 但需求描述的是 "设备空闲卡...是否前8和后8的组合"，这描述的是 *状态*。
            # 结合 "比如2卡时，0卡和9卡空闲"，这暗示了 *仅有* 这些卡空闲的情况。
            
            # 我的解释：
            # 我们需要 `required_count` 张卡。
            # 如果我们找不到 `required_count` 张卡处于同一组 (0-7 或 8-15)，则不满足。
            
            # 对于全套模型，它可能需要运行 1卡, 2卡, 4卡, 8卡 的case。
            # 所以我们需要确保设备能提供 8卡同组 (如果总共>=8) 或者 4卡同组 (如果总共>=4)。
            # 需求说 "设备空闲4张卡、8张卡时..."
            # 如果空闲4张，必须同组。
            # 如果空闲8张，必须同组。
            # 如果空闲 > 8张 (例如16张)，那肯定能找到同组的，所以通常满足。
            # 只有当空闲数量较少且分散时才成问题。
            
            if idle_count == 4 or idle_count == 8:
                 if not self._check_topology(idle_cards, idle_count):
                    return False, "全套模型测试空闲卡拓扑不满足 (跨越前8/后8卡组合)"
        
        return True, "资源满足"

    def _get_idle_cards(self, device: Device) -> List[int]:
        """获取设备空闲卡ID列表"""
        # 从 accelerator_status 解析
        # 格式 {"gpus": [{"status": "idle", "name": "..."}]} 或 {"npus": [{"id": 0, "status": "idle"}]}
        status_json = device.accelerator_status
        if not status_json:
            return []
            
        idle_ids = []
        
        if "gpus" in status_json:
            for idx, gpu in enumerate(status_json["gpus"]):
                if gpu.get("status") == "idle":
                    # GPU通常没有显式ID，使用索引
                    idle_ids.append(idx)
                    
        elif "npus" in status_json:
            for npu in status_json["npus"]:
                if npu.get("status") == "idle":
                    # NPU有显式ID
                    idle_ids.append(int(npu.get("id", 0)))
                    
        return sorted(idle_ids)

    def _check_topology(self, idle_cards: List[int], count_needed: int) -> bool:
        """
        检查是否能找到 count_needed 张卡，满足同组约束 (全在0-7 或 全在8-15)
        
        Args:
            idle_cards: 空闲卡ID列表
            count_needed: 需要的卡数
            
        Returns:
            bool: 是否满足
        """
        # 组1: 0-7
        group1 = [c for c in idle_cards if 0 <= c <= 7]
        # 组2: 8-15
        group2 = [c for c in idle_cards if 8 <= c <= 15]
        
        # 如果任一组的数量足够，则满足
        if len(group1) >= count_needed:
            return True
        if len(group2) >= count_needed:
            return True
            
        return False

    def get_dispatch_time(self, device_id: int):
        return self._device_last_dispatch.get(device_id)
