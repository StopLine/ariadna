"""
Pydantic модель для Ariandna plugin
"""

import json
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints
from pydantic.config import ConfigDict
from pathlib import Path


class SrcLink(BaseModel):
    """Ссылка на место в исходном коде"""
    path: str = Field('', description="Путь к исходному файлу")
    line_num: int = Field(0, description="Номер строки")
    line_content: str = Field('', description="Ожидаемое содержимое строки")


Comment = Annotated[str, StringConstraints(max_length=255)]

class Node(BaseModel):
    id: int = Field(description="Уникальный идентификатор узла")
    parent_id: int | None = Field(None, description="Идентификатор родительского узла")
    src_link: SrcLink | None = Field(None, description="Ссылка на место в исходном коде")
    caption: str = Field('', description="Название узла")
    comments: list[Comment] = Field([], description="Список комментариев")
    childs: list[Node] = Field([], description="Список дочерних узлов дерева")


class AriadnaThread(BaseModel):
    """Модель треда"""
    title: str = Field(description="Название треда", max_length=255)
    root_path: str = Field('/', description="Родительский каталог для исходного кода",
                           max_length=255)
    description: Comment | None = Field(None, description="Описание треда")
    childs: list[Node] = Field([], description="Список дочерних узлов дерева")
    vcs_rev: str | None = Field(None, description="Ревизия системы контроля версий, "
                                "для которой актулен данный тред",
                                max_length=255)


def build_sample1() -> AriadnaThread:
    thread = AriadnaThread(
        title="Разбор декоратора @lru_cache, бесконечный кеш",
        description="""
        Исследуем простое кеширование при maxsize=None
        """.strip(),
        root_path='/usr/lib/python3.14'
    )
    node_cnt = 0
    root = Node(
        id = node_cnt,
        caption="Реализация декоратора",
        src_link = SrcLink(
            path='functools.py',
            line_num=479,
            line_content="def lru_cache(maxsize=128, typed=False):",
            comments=["TODO: разобрать реализацию алгоритма LRU"]
        ),
    )
    thread.childs.append(root)
    node_cnt += 1

    child1 = Node(
        id = node_cnt,
        caption="Внимание на разницу между maxsize=0 и maxsize=None!",
        src_link = SrcLink(
            path='functools.py',
            line_num=540,
            line_content="    if maxsize == 0:",
        ),
    )
    node_cnt += 1
    root.childs.append(child1)

    child2 = Node(
        id = node_cnt,
        caption="Непосредственно работа с кэшем",
        src_link = SrcLink(
            path='functools.py',
            line_num=551,
            line_content="# Simple caching without ordering or size limit",
        ),
        comments=[
            "Нас интересует этот случай, простое кеширование",
            """Видно, что используется простой словарь: ключ -- некий хеш, значение -- 
            количество вхождений (хиты).
            Их можно вытащить через метод <func>.cache_info()"""
        ],
    )
    node_cnt += 1
    root.childs.append(child2)

    return thread


def to_json(data, fname):
    Path(fname).write_text(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    model_schema = AriadnaThread.model_json_schema()
    to_json(model_schema, 'model_schema.json')

    sample1 = build_sample1()
    to_json(sample1.model_dump(), 'sample1_data.json')
