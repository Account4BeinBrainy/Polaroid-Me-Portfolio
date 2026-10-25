"""
build_film_box_outer_cover_v8.py
==============================
在 Blender 的 Text Editor 中打开本文件，点击 Run Script。

结构：
    FilmBox_Root
    ├── InnerTray   2mm 壁厚、顶部开口、前低后高，底板与侧壁连为一个实体
    └── OuterCover  2mm 壁厚、顶部封闭、底部开口，整个外壳沿 +Z 拔出

v8 重新生成完整壁体，不使用 Solidify、Bevel、Smooth 或额外底板。
每个部件只有一个连续的实体网格；直角处共用顶点，不叠放纸板。
保持 v7 的主体尺寸；取消 v7 为掩盖问题而添加的内盒上移 0.2mm。
默认关闭状态。将 COVER_OPEN_PREVIEW 改为 True 可预览打开。
仅生成几何，不增加绿色、Logo、灯光或网页动画。

运行会替换之前脚本生成的纸盒对象（含其 .001 等副本），不删除其他场景内容。
自动另存 film-box-v8.blend，不覆盖旧版 film-box.blend。
常规 Python 可运行：python build_film_box_outer_cover_v8.py --check
该命令仅检查几何数据，不生成 Blender 场景。
"""

from collections import Counter, defaultdict
import math
import os
import re
import sys

# ==================== 可调整参数 ====================
# 所有 CM 参数单位是厘米，MM 参数单位是毫米。
OUTER_WIDTH_CM = 10.0
OUTER_DEPTH_CM = 4.2
OUTER_HEIGHT_CM = 12.0
WALL_THICKNESS_CM = 0.2                 # 内盒、外壳均为 2mm

# 这里的 GAP 是两块纸板之间的实际空隙，不包括纸板自身厚度。
SIDE_GAP_MM = 0.5                       # 左右每侧 0.5mm；内盒宽 9.5cm
FRONT_BACK_GAP_MM = 0.1                 # 前后每侧 0.1mm；内盒深 3.78cm
INNER_WIDTH_CM = OUTER_WIDTH_CM - 2 * WALL_THICKNESS_CM - 2 * SIDE_GAP_MM / 10
INNER_DEPTH_CM = OUTER_DEPTH_CM - 2 * WALL_THICKNESS_CM - 2 * FRONT_BACK_GAP_MM / 10
INNER_FRONT_HEIGHT_CM = 9.2
INNER_REAR_HEIGHT_CM = 11.5
INNER_BOTTOM_EXPOSURE_CM = 0.3          # 内盒底部实际露出 3mm

COVER_OPEN_PREVIEW = False
COVER_LIFT_DISTANCE_CM = 13.0
AUTO_FRAME_VIEW = True
AUTO_SAVE_BLEND = True
BLEND_FILENAME = "film-box-v8.blend"
OUTPUT_DIRECTORY = ""                 # 留空：保存在当前 .blend 所在文件夹
COLLECTION_NAME = "FilmBox_Model"
OWNER_KEY = "film_box_generator"
OWNER_VALUE = "outer_cover_v8"

# 坐标：X 左右，Y 前后（内盒前面 Y=0），Z 向上。网页导出时可能转换坐标轴。


def cm(value):
    return float(value) / 100.0


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def ring(x0, x1, y0, y1, height_at_y):
    """从上方看为逆时针；所有壁面均引用这些共享角点。"""
    return [(x0, y0, height_at_y(y0)), (x1, y0, height_at_y(y0)),
            (x1, y1, height_at_y(y1)), (x0, y1, height_at_y(y1))]


def make_shell(width, depth, front_height, rear_height, thickness, opening):
    """直接构造有厚度的封闭壁体。opening 为 top 或 bottom。参数单位为米。

    4 个环共 16 点：外下环、外上环、内下环、内上环。
    14 个面：4 外壁、4 内壁、4 开口处端面、2 底板/顶板表面。
    物体的内部空腔保持开口，但纸板实体本身没有破洞或悬空边。
    """
    if opening not in {"top", "bottom"}:
        raise ValueError("opening 只能是 top 或 bottom")
    if min(width, depth, front_height, rear_height) <= 2 * thickness:
        raise ValueError("尺寸太小，无法容纳指定的纸壁厚度")
    if opening == "bottom" and abs(front_height - rear_height) > 1e-12:
        raise ValueError("本版本的外壳顶面必须水平")

    half = width / 2
    top_z = lambda y: front_height + (rear_height - front_height) * y / depth
    inner_floor = thickness if opening == "top" else 0.0
    inner_top = top_z if opening == "top" else (lambda y: front_height - thickness)
    vertices = (
        ring(-half, half, 0, depth, lambda y: 0.0)
        + ring(-half, half, 0, depth, top_z)
        + ring(-half + thickness, half - thickness, thickness, depth - thickness,
               lambda y: inner_floor)
        + ring(-half + thickness, half - thickness, thickness, depth - thickness,
               inner_top)
    )
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        faces.append((i, j, 4 + j, 4 + i))                # 外壁朝外
        faces.append((8 + j, 8 + i, 12 + i, 12 + j))     # 内壁朝空腔

    if opening == "top":
        faces.extend([(3, 2, 1, 0), (8, 9, 10, 11)])     # 底板下/上表面
        for i in range(4):
            j = (i + 1) % 4
            faces.append((4 + i, 4 + j, 12 + j, 12 + i)) # 斜口纸板端面
    else:
        faces.extend([(4, 5, 6, 7), (15, 14, 13, 12)])   # 顶板外/内表面
        for i in range(4):
            j = (i + 1) % 4
            faces.append((i, 8 + i, 8 + j, j))           # 开放底口纸板端面

    outer_volume = width * depth * (front_height + rear_height) / 2
    if opening == "top":
        cavity_height = (front_height + rear_height) / 2 - thickness
    else:
        cavity_height = front_height - thickness
    expected_volume = outer_volume - (width - 2 * thickness) * (depth - 2 * thickness) * cavity_height
    return {"vertices": vertices, "faces": faces, "expected_volume": expected_volume}


def validate_mesh_data(name, data):
    """检查重复面、断边、面方向、连通性、平面性和实体体积。"""
    vertices, faces = data["vertices"], data["faces"]
    if len(set(vertices)) != len(vertices):
        raise ValueError(f"{name}: 存在重复顶点")
    if len({tuple(sorted(face)) for face in faces}) != len(faces):
        raise ValueError(f"{name}: 存在重复面")
    edges, directed, graph = Counter(), Counter(), defaultdict(set)
    volume = 0.0
    for face in faces:
        p0, p1, p2 = (vertices[i] for i in face[:3])
        normal = cross(sub(p1, p0), sub(p2, p0))
        norm_len = math.sqrt(dot(normal, normal))
        if norm_len < 1e-14:
            raise ValueError(f"{name}: 存在零面积面")
        for index in face:
            if abs(dot(normal, sub(vertices[index], p0))) / norm_len > 1e-9:
                raise ValueError(f"{name}: 存在非平面四边形")
        for i, a in enumerate(face):
            b = face[(i + 1) % len(face)]
            edges[tuple(sorted((a, b)))] += 1
            directed[(a, b)] += 1
            graph[a].add(b)
            graph[b].add(a)
        for i in range(1, len(face) - 1):
            volume += dot(p0, cross(vertices[face[i]], vertices[face[i + 1]])) / 6
    if any(n != 2 for n in edges.values()):
        raise ValueError(f"{name}: 有断边或多层重叠边")
    if any(directed[(a, b)] != 1 or directed[(b, a)] != 1 for a, b in edges):
        raise ValueError(f"{name}: 相邻面的朝向不一致")
    visited, todo = set(), [0]
    while todo:
        index = todo.pop()
        if index not in visited:
            visited.add(index)
            todo.extend(graph[index] - visited)
    if len(visited) != len(vertices):
        raise ValueError(f"{name}: 有未连接的额外薄片")
    if volume <= 0 or not math.isclose(volume, data["expected_volume"], rel_tol=1e-8, abs_tol=1e-12):
        raise ValueError(f"{name}: 实体体积或表面方向异常")
    return {"vertices": len(vertices), "faces": len(faces), "edges": len(edges),
            "connected_components": 1, "volume_cm3": volume * 1e6}


def build_data():
    vals = [OUTER_WIDTH_CM, OUTER_DEPTH_CM, OUTER_HEIGHT_CM, WALL_THICKNESS_CM,
            INNER_WIDTH_CM, INNER_DEPTH_CM, INNER_FRONT_HEIGHT_CM, INNER_REAR_HEIGHT_CM,
            SIDE_GAP_MM, FRONT_BACK_GAP_MM, COVER_LIFT_DISTANCE_CM]
    if any(not math.isfinite(v) or v <= 0 for v in vals):
        raise ValueError("尺寸、装配间隙及抬升距离都必须为正数")
    if INNER_BOTTOM_EXPOSURE_CM < 0:
        raise ValueError("底部露出量不能小于零")

    # 按真实内腔计算装配余量；不拿纸壁厚度当作空隙。
    side_gap = (OUTER_WIDTH_CM - 2 * WALL_THICKNESS_CM - INNER_WIDTH_CM) / 2
    depth_gap = (OUTER_DEPTH_CM - 2 * WALL_THICKNESS_CM - INNER_DEPTH_CM) / 2
    top_gap = INNER_BOTTOM_EXPOSURE_CM + OUTER_HEIGHT_CM - WALL_THICKNESS_CM - max(
        INNER_FRONT_HEIGHT_CM, INNER_REAR_HEIGHT_CM)
    if min(side_gap, depth_gap, top_gap) <= 1e-6:
        raise ValueError("内盒没有完全装入外壳内腔：请检查宽度、深度或高度")
    if INNER_BOTTOM_EXPOSURE_CM + COVER_LIFT_DISTANCE_CM <= max(
            INNER_FRONT_HEIGHT_CM, INNER_REAR_HEIGHT_CM):
        raise ValueError("打开距离太短，外壳还未完全离开内盒")

    inner = make_shell(cm(INNER_WIDTH_CM), cm(INNER_DEPTH_CM), cm(INNER_FRONT_HEIGHT_CM),
                       cm(INNER_REAR_HEIGHT_CM), cm(WALL_THICKNESS_CM), "top")
    cover = make_shell(cm(OUTER_WIDTH_CM), cm(OUTER_DEPTH_CM), cm(OUTER_HEIGHT_CM),
                       cm(OUTER_HEIGHT_CM), cm(WALL_THICKNESS_CM), "bottom")
    inner["location"] = (0.0, 0.0, 0.0)
    cover["location"] = (0.0, cm(-(OUTER_DEPTH_CM - INNER_DEPTH_CM) / 2),
                         cm(INNER_BOTTOM_EXPOSURE_CM + (COVER_LIFT_DISTANCE_CM if COVER_OPEN_PREVIEW else 0)))
    report = {"InnerTray": validate_mesh_data("InnerTray", inner),
              "OuterCover": validate_mesh_data("OuterCover", cover),
              "side_gap_mm": round(side_gap * 10, 6),
              "front_back_gap_mm": round(depth_gap * 10, 6),
              "top_gap_mm": round(top_gap * 10, 6),
              "bottom_exposure_mm": round(INNER_BOTTOM_EXPOSURE_CM * 10, 6)}
    return {"InnerTray": inner, "OuterCover": cover}, report


def cleanup_old_box(bpy):
    """只移除本系列脚本的纸盒对象和数字后缀副本，不全选删除场景。"""
    legacy = {"InnerTray", "OuterCover", "OuterBody", "OuterSleeve", "Lid", "LidPivot", "FilmBox_Root"}
    for obj in list(bpy.data.objects):
        base = re.sub(r"\.\d{3,}$", "", obj.name)
        if base in legacy or obj.get(OWNER_KEY) == OWNER_VALUE:
            mesh = obj.data if obj.type == "MESH" else None
            bpy.data.objects.remove(obj, do_unlink=True)
            if mesh is not None and mesh.users == 0:
                bpy.data.meshes.remove(mesh)


def setup_view(bpy, objects):
    from mathutils import Vector
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]  # 真正的 mesh，不选空 Root
    if not AUTO_FRAME_VIEW:
        return
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != 'VIEW_3D':
                continue
            space = area.spaces.active
            space.clip_start = 0.0001
            space.clip_end = 10.0
            space.shading.type = 'SOLID'
            # 不透视选中边，不用 X-ray 把隐藏内盒的边显示成“第三层”。
            space.shading.show_xray = False
            if hasattr(space.shading, "show_xray_wireframe"):
                space.shading.show_xray_wireframe = False
            space.region_3d.view_perspective = 'PERSP'
            space.region_3d.view_rotation = Vector((3.0, -5.0, 2.6)).to_track_quat('Z', 'Y')
            region = next((r for r in area.regions if r.type == 'WINDOW'), None)
            if region is not None:
                try:
                    with bpy.context.temp_override(window=window, area=area, region=region):
                        bpy.ops.view3d.view_selected(use_all_regions=False)
                except RuntimeError:
                    points = [o.matrix_world @ Vector(v) for o in objects for v in o.bound_box]
                    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
                    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
                    space.region_3d.view_location = (lo + hi) / 2
                    space.region_3d.view_distance = max(hi - lo) * 3.5


def save_new_file(bpy):
    if not AUTO_SAVE_BLEND:
        return None
    if OUTPUT_DIRECTORY:
        directory = os.path.abspath(os.path.expanduser(OUTPUT_DIRECTORY))
    elif bpy.data.filepath:
        directory = os.path.dirname(bpy.data.filepath)
    else:
        # 首选 Text Editor 打开的脚本所在目录；否则使用 Desktop/film-box-project。
        area = bpy.context.area
        text = area.spaces.active.text if area and area.type == 'TEXT_EDITOR' else None
        path = bpy.path.abspath(text.filepath) if text and text.filepath else ""
        directory = os.path.dirname(path) if path and os.path.isdir(os.path.dirname(path)) else os.path.join(
            os.path.expanduser("~"), "Desktop", "film-box-project")
    os.makedirs(directory, exist_ok=True)
    target = os.path.join(directory, BLEND_FILENAME)
    current = os.path.abspath(bpy.data.filepath) if bpy.data.filepath else ""
    if os.path.exists(target) and os.path.abspath(target) != current:
        # 同目录已存在别的 v8 文件时不覆盖，另存为编号副本。
        stem, ext = os.path.splitext(target)
        index = 1
        while os.path.exists(f"{stem}_{index:03d}{ext}"):
            index += 1
        target = f"{stem}_{index:03d}{ext}"
    bpy.ops.wm.save_as_mainfile(filepath=target)
    return target


def main():
    import bpy
    data, report = build_data()  # 几何和装配检查通过后，才替换旧对象。
    if bpy.context.object is not None and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    cleanup_old_box(bpy)

    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(COLLECTION_NAME)
    if collection.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(collection)
    collection.hide_viewport = False
    collection.hide_render = False

    # 仅显示物理单位，不缩放现有场景或模型。
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.unit_settings.length_unit = 'CENTIMETERS'
    root = bpy.data.objects.new("FilmBox_Root", None)
    root.empty_display_type = 'PLAIN_AXES'
    root.empty_display_size = cm(0.5)
    root[OWNER_KEY] = OWNER_VALUE
    collection.objects.link(root)
    objects = []
    for name, spec in data.items():
        mesh = bpy.data.meshes.new(name + "_mesh")
        mesh.from_pydata(spec["vertices"], [], spec["faces"])
        mesh.update(calc_edges=True)
        if mesh.validate(verbose=False):
            raise RuntimeError(f"{name}: Blender 修改了网格，请停止保存并检查")
        for poly in mesh.polygons:
            poly.use_smooth = False
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        obj.parent = root
        # 父级是新建的单位矩阵；先 parent 再设置位置，避免读取尚未更新的 matrix_world。
        obj.location = spec["location"]
        obj.show_in_front = False
        obj.show_wire = False
        obj.show_all_edges = False
        obj[OWNER_KEY] = OWNER_VALUE
        obj["wall_thickness_mm"] = WALL_THICKNESS_CM * 10
        objects.append(obj)
    cover = objects[1]
    cover["closed_z_m"] = cm(INNER_BOTTOM_EXPOSURE_CM)
    cover["open_z_m"] = cm(INNER_BOTTOM_EXPOSURE_CM + COVER_LIFT_DISTANCE_CM)
    cover["opening_axis_blender"] = "+Z"
    bpy.context.view_layer.update()
    # 验证 Blender 实际放置没有丢失深度居中或高度偏移。
    for obj in objects:
        wanted = data[obj.name]["location"]
        if any(abs(obj.matrix_world.translation[i] - wanted[i]) > 1e-7 for i in range(3)):
            raise RuntimeError(f"{obj.name}: 世界坐标与预计装配位置不一致")
    setup_view(bpy, objects)
    print("\n========== Film Box v8 ==========")
    for key, value in report.items():
        print(key, ":", value)
    print("只有 InnerTray + OuterCover 两个实体；无 Solidify / Bevel / 额外底板。")
    print("当前预览：", "OPEN" if COVER_OPEN_PREVIEW else "CLOSED")
    try:
        saved = save_new_file(bpy)
        if saved:
            print("已保存：", saved)
    except (OSError, RuntimeError) as exc:
        print("几何已生成，但自动保存失败，请 File > Save As：", exc)


if __name__ == "__main__":
    if "--check" in sys.argv:
        import json
        _, result = build_data()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("几何数据检查通过。此模式不运行 Blender，不代表已验证 Blender 界面显示。")
    else:
        main()
