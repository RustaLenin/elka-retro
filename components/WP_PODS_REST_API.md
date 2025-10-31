# Pods REST API Data Model

## Структура данных в Pods REST API

Pods REST API возвращает данные в зависимости от способа их создания и настроек Pods. Важно учитывать различия между моковыми и реальными данными.

## Экземпляры игрушек (toy_instance) в ответе типа (toy_type)

Когда запрашивается тип игрушки с `_embed=1`, экземпляры приходят в поле `instances` как массив объектов.

### Различия в структуре данных

#### Вариант 1: Моковые данные (через fixtures.php)
```json
{
  "instances": [
    {
      "id": 79,
      "post_title": "1-1-2-2",
      "cost": "4200.00",
      "tube_conditions": 51,  // ID термина
      "tube_condition": [      // ✅ Массив объектов терминов (развернутые данные)
        {
          "term_id": "50",
          "name": "100%",
          "slug": "100",
          "taxonomy": "tube_condition",
          ...
        }
      ],
      "authenticity": [
        {
          "term_id": "37",
          "name": "Оригинал",
          "slug": "origin",
          ...
        }
      ],
      "condition": [
        {
          "term_id": "42",
          "name": "Люкс",
          "slug": "excellence",
          ...
        }
      ],
      ...
    }
  ]
}
```

#### Вариант 2: Реальные данные (созданные через админку Pods)
```json
{
  "instances": [
    {
      "id": 100,
      "post_title": "1-3-3-3",
      "cost": "3333.00",
      "tube_conditions": 51,  // ID термина (есть)
      "tube_condition": false, // ❌ false - термины не развернуты
      "authenticity": false,
      "condition": false,
      ...
    }
  ]
}
```

### Причина различий

1. **Моковые данные** используют `pods()->save()` для установки таксономий, что может влиять на то, как Pods возвращает данные в REST API.

2. **Реальные данные**, созданные через админку Pods, могут не разворачивать термины в полные объекты, возвращая только ID в полях типа `tube_conditions`, `authenticitys`, `conditions`.

3. Настройки Pods в REST API могут влиять на глубину развертывания связанных данных.

## Правильная обработка данных

### Алгоритм получения `tube_condition`:

1. **Приоритет 1**: Проверить `instance.tube_condition`:
   - Если это массив объектов → использовать `tube_condition[0].slug`
   - Если это `false` или пустой → перейти к шагу 2

2. **Приоритет 2**: Использовать `instance.tube_conditions` (ID термина):
   - Если это число → загрузить термин через REST API: `/wp-json/wp/v2/tube_condition/{id}`
   - Преобразовать ответ в формат массива объектов для единообразия

### Пример реализации в коде:

```javascript
// В toy-type-single.js при загрузке экземпляров
if (!instanceData.tube_condition || instanceData.tube_condition === false) {
  const tubeConditionsId = instanceData.tube_conditions;
  if (tubeConditionsId && typeof tubeConditionsId === 'number') {
    try {
      const termRes = await fetch(`/wp-json/wp/v2/tube_condition/${tubeConditionsId}`, { credentials: 'same-origin' });
      if (termRes.ok) {
        const termData = await termRes.json();
        instanceData.tube_condition = [{
          term_id: String(termData.id),
          name: termData.name,
          slug: termData.slug,
          taxonomy: 'tube_condition',
          id: termData.id
        }];
      }
    } catch (e) {
      console.warn('Failed to load tube_condition term:', e);
    }
  }
}
```

## Общие правила работы с Pods REST API

### Поля таксономий в экземплярах:

| Поле в Pods | Формат в REST API (моки) | Формат в REST API (реальные) | Обработка |
|------------|--------------------------|------------------------------|-----------|
| `tube_conditions` | `number` (ID) | `number` (ID) | Всегда ID |
| `tube_condition` | `array` объектов терминов | `false` или отсутствует | Проверять наличие |
| `authenticitys` | `number` (ID) | `number` (ID) | Всегда ID |
| `authenticity` | `array` объектов терминов | `false` или отсутствует | Проверять наличие |
| `conditions` | `number` (ID) | `number` (ID) | Всегда ID |
| `condition` | `array` объектов терминов | `false` или отсутствует | Проверять наличие |

### Рекомендации:

1. **Всегда проверяйте оба варианта**: поля с множественным числом (`tube_conditions`, `authenticitys`, `conditions`) содержат ID, а поля в единственном числе (`tube_condition`, `authenticity`, `condition`) могут быть массивами объектов или `false`.

2. **Загружайте термины по ID**, если они не развернуты:
   - `/wp-json/wp/v2/{taxonomy_slug}/{term_id}`
   - Например: `/wp-json/wp/v2/tube_condition/51`

3. **Нормализуйте данные** в единый формат массива объектов для последующей обработки.

4. **Используйте кеширование** для терминов, чтобы не делать множественные запросы к API.

5. **Учитывайте производительность**: для большого количества экземпляров лучше собирать все ID терминов и делать batch-запросы.

## Пример нормализации данных экземпляра

```javascript
async function normalizeInstanceData(instance, jsonData) {
  const normalized = { ...instance };
  
  // Нормализуем tube_condition
  if (!normalized.tube_condition || normalized.tube_condition === false) {
    const tubeId = normalized.tube_conditions;
    if (tubeId && typeof tubeId === 'number') {
      try {
        const termRes = await fetch(`/wp-json/wp/v2/tube_condition/${tubeId}`);
        if (termRes.ok) {
          const term = await termRes.json();
          normalized.tube_condition = [{
            term_id: String(term.id),
            name: term.name,
            slug: term.slug,
            taxonomy: 'tube_condition',
            id: term.id
          }];
        }
      } catch (e) {
        console.warn('Failed to load tube_condition:', e);
      }
    }
  }
  
  // Аналогично для других таксономий...
  
  return normalized;
}
```

