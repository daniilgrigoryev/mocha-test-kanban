# Инструкция по запуску тестов для Kanban.

Приложение Kanban состоит из двух основных функциональных возможностей:

- Поиск и фильтрация задач;
- Создание задачи;

> **Тесты были написаны с целью проверки роботоспособности API на корректность возвращаемых данных.**

### Первоначальная настрйока

В файле _tests/env.js_ Необходимо прописать адреса подключения к серверу.
![](../resources/tests/3.png)

### Структура папок и файлов

```sh
├── tests/
│   ├── source/                # ресурсы с тестовыми данными
│   │   │── filters/           # варианты фильтров
│   │   │   ├── complex.json   # прим. сложного фильтра
│   │   │   ├── simple.json    # ...их может быть сколько угодно
│   ├── env.js/                # переменные окружения для логина в 3dexperience
│   ├── test.js/               # код тестов
```

## Тестирование фильта.

Фильтр состоит из двух частей:

1. Пользовательский
2. Административный

![](../resources/tests/1.png)

Административный фильтр имеет возможность сохранения cвоих настроек на стороне сервера,
_но с точки зрения работоспособности фильтры работают одинаково и синхронно_

Оба фильтра отправляют параметры в формате JSON одним файлом:

```json
{
  "t": "AND",
  "o": [
    {
      "t": "EQ",
      "p": "owner",
      "v": "p:admin_platform"
    }
  ]
}
```

А сервер присылает JS объект с задачами по одному объекту на один запрос по одной линии:
![](../resources/tests/4.png)

> Цель теста проверить, удовлетворяют ли задачи пришедшие с сервера условиям в фильтре.

## Формирование фильтра для теста

Чтобы сформировать JSON файл фильтра - необходимо сделать поиск тасков через административный или пользовательский фильтр.

JSON строка фильтра находится в отправляемом запросе во вкладке network в инструментах разработчика.

![](../resources/tests/2.png)

В приложении фильтры формируется в разных запросах, но для тестов это всегда один файл. Между пользовательским и администртивным фильтром всегда стоит логическое **AND**

JSON файлы для запроса хранятся в папке
_tests/source/filters_

```json
{
  "t": "AND",
  "o": [
    {
      // пользовательский фильтр
    },
    {
      // административный фильтр
    }
  ]
}
```

## Тестирование создания задачи.

Создание задачи, добавления и удаления. Описываются в декларативном стиле в файле _tests/test.js_ в тесте.

```js
describe('Test different abilities with tasks'
```

Тесты запускаются через такую команду

```bash
npm run test
```
