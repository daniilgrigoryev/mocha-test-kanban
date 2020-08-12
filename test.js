import chai from 'chai'
import EnoAPI from '@igatec/eno-api/lib/@igatec/eno-api'
import { FILTERS } from './source/testData.js'

const configPath = `${process.cwd()}/tests/config.json`
const config = require(configPath)
const Context = require('eno-context').default
const { enoviaConfig } = config
const context = new Context(enoviaConfig)
const expect = chai.expect
const DomainObject = EnoAPI.DomainObject

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const CONFIG = {
  BOARDS: null,
  LANES: null,
  async getBoards() {
    try {
      this.BOARDS = await context.get(`/resources/iga/kanban/boards`)
    } catch (error) {
      console.log(error)
    }
  },
  async getLanes(id) {
    try {
      this.LANES = await context.get(`/resources/iga/kanban/schemes/State?board=${id}`)
    } catch (error) {
      console.log(error)
    }
  },
}
const getDataRequest = async (jsonFile, objParams) => {
  const filter = JSON.stringify(jsonFile)
  const properties = objParams || {}

  const {
    laneScheme = 'State',
    laneId = CONFIG.LANES.data.lanes[0].id,
    pageSize = 10,
    page = 0,
    laneDefault = true,
    laneState = 'Create',
    schemeType = 'Dynamic',
    sort_field = null,
    sort_type = null,
  } = properties

  const params = {
    laneScheme,
    laneId,
    pageSize,
    page,
    laneDefault,
    laneState,
    schemeType,
    sort_field,
    sort_type,
    filter,
  }

  let esc = encodeURIComponent
  let qs = Object.keys(params)
    .map((k) => esc(k) + '=' + esc(params[k]))
    .join('&')
  let url = `/resources/iga/kanban/tasks?${qs}`

  try {
    let response = await context.get(url)
    return response
  } catch (error) {
    console.log(error)
  }
}
const requestCreateNewTask = async (objParams) => {
  let {
    laneId = CONFIG.LANES.data.lanes[0].id,
    schemeType = 'Dynamic',
    laneScheme = 'State',
    id = null,
    title = null,
    description = null,
    priority = 'normal',
    estDuration = null,
    dueDate = '',
    estStartDate = null,
    percent = 0,
    needsReview = true,
    isProjectTask = true,
    tag = [],
    assignee = [],
    parentTask = null,
    project = null,
  } = objParams

  let data = {
    laneId,
    schemeType,
    laneScheme,
    id,
    title,
    description,
    priority,
    estDuration,
    dueDate,
    estStartDate,
    percent,
    needsReview,
    isProjectTask,
    tag,
    assignee,
    parentTask,
    project,
  }

  data = JSON.stringify(data)

  try {
    let response = await context.put(`/resources/iga/kanban/v2/task`, {
      body: data,
    })
    return response
  } catch (error) {
    console.log(error)
  }
}
const requestUpdateTask = async (objParams, ...params) => {
  // const lanesIDS = LANES.laneId

  // modify
  // description: Description set by automated test
  // priority: critical
  // percent: 75
  // dueDate: 1553720400000

  // add
  // assignee: admin_platform
  // tag: 4A16010D00002A3C5C50314600000006
  // context: 82E6368C00000A585A56534A0000C3EF
  // document: 5D7E531700000B4C5AD61E54000065B9
  // deliverable: 5D7E531700000B4C5AD61E54000065B9

  let [action, task, type] = params
  let id = task.data.basic.id
  let taskData = task
  let data = objParams || {}

  // в виде строки get запроса
  let queryString = Object.keys(data)
    .map((key) => key + '=' + data[key])
    .join('&')

  // в виде JSON строки
  let queryJSON = JSON.stringify(data)

  try {
    let response
    if (action === 'add' || action === 'remove') {
      if (type === 'Message') {
        response = await context.put(`/resources/iga/kanban/task?action=${action}&id=${id}&type=${type}`, {
          body: queryJSON,
        })
      } else {
        // console.log(`/resources/iga/kanban/task?action=${action}&id=${id}&${queryString}`)
        response = await context.put(`/resources/iga/kanban/task?action=${action}&id=${id}&${queryString}`)
      }
    } else if (action === 'addItem') {
      let lastCheckListID = taskData.data.checklist[0].id
      response = await context.put(`resources/iga/kanban/checklists/${lastCheckListID}/addItem?${queryString}`)
    } else if (action === 'setLine') {
      // setLine === modify which don't sent data from body
      response = await context.put(`/resources/iga/kanban/task?action=modify&id=${id}&${queryString}`)
    } else {
      response = await context.put(`/resources/iga/kanban/task?action=${action}&id=${id}&`, {
        body: queryJSON,
      })
    }

    return response
  } catch (error) {
    console.log(error)
  }
}
// добавляет в массив name всех найденных assigne или owner
// owner обычно один всегда, так что не парься чувак все ровно
// task: object
// property: String
const getTaskData = (task, property) => {
  let data = []
  let field = task[property] || task.basic[property]
  if (field && field instanceof Array) {
    field.forEach((obj) => (property == 'assignee' ? data.push(obj.name) : data.push(obj.id)))
  } else {
    property == 'owner' ? data.push(field.name) : data.push(field)
  }
  // if (data.includes('Active')) data.push('Assigned')
  // else if (data.includes('Assigned')) data.push('Active')
  return data
}
// val = значение из json
// array - значения из тасков
const isAnyMutch = (val, array) => {
  if (val) {
    let value = val.replace(/\p:/g, '')
    // console.log(`${array.includes(value)} \t ${chalk.blue(value)}  ${chalk.redBright(array)}`)
    return array.includes(value)
  }
}
const isDataInRange = (prop, data) => {
  if (prop && data) {
    let { to } = prop
    let { dueDate } = data.basic
    // console.log(`${to > dueDate} \t ${chalk.blue(to)}  ${chalk.redBright(dueDate)}`)
    expect(to).to.be.at.least(dueDate)
    return to > dueDate
  }
}
const testAction = (operation, ...otherParams) => {
  // properties, ...params
  // let [action, createdTask, type] = params
  // let taskID = createdTask.data.basic.id
  // let queryData = properties
  const action = operation

  let [createdTask, requestData = {}, type, callback] = otherParams
  // let taskID = createdTask.data.basic.id
  let task = createdTask

  describe('Test action with task', () => {
    let updatedTask

    it('Response are successful', async () => {
      updatedTask = await requestUpdateTask(requestData, action, task, type)
      let status = updatedTask.success
      expect(status).to.be.true
    })
    if (action === 'modify') {
      for (let [key, value] of Object.entries(requestData)) {
        it(`Task info modify by ${key} successfully`, () => {
          expect(updatedTask.data.basic[key]).to.equal(value)
          // console.log(`${chalk.blue(createdTask.data.basic[key] || null)} : ${chalk.redBright(updatedTask.data.basic[key])}`)
        })
      }
    } else if (action === 'setLine') {
      it(`Line set on line ${requestData.laneId}`, () => {
        let message = updatedTask.message
        expect(message).to.have.string('Message.Task.Modified')
      })
    } else {
      for (let [key, value] of Object.entries(requestData)) {
        it(`Action: ${action} | property: ${key} | value: ${value}`, () => {
          // проверка вообщем всех объектов на совпадение с value
          // if (Array.isArray(updatedTask.data[key])) {
          //   let allValues = []
          //   updatedTask.data[key].forEach((el) => {
          //     let inputValues = Object.values(el)
          //     allValues = allValues.concat(inputValues)
          //   })
          //   let isAnyMutch = allValues.includes(value)
          //   expect(isAnyMutch).to.be.true
          // }

          // проверяет только последний добавленный элемент
          if (Array.isArray(updatedTask.data[key] && updatedTask.data[key].length != 0)) {
            let newElement = updatedTask.data[key][0]
            let isMatch = Object.values(newElement).includes(value)
            switch (action) {
              case 'add':
                expect(isMatch).to.be.true
                break
              case 'remove':
                expect(isMatch).to.be.false
                break
              default:
                expect(isMatch).to.be.true
                break
            }
          }
        })
      }
    }
    after(() => {
      callback && callback(updatedTask)
    })
  })
}
const testCreateNewTask = (params, callback) => {
  let dataParams = params
  let task

  it(`Test task creating`, async () => {
    task = await requestCreateNewTask(dataParams)
    // console.log(`${chalk.yellow('title')}: ${chalk.blue(dataParams.title)} == ${chalk.redBright(task.data.basic.title)}`)
    expect(task.data.basic.title).to.be.a('string').to.not.be.empty
    expect(task.data.basic.title).to.equal(dataParams.title)
  })
  after(() => {
    callback && callback(task)
  })
}
const testCoincidenceDataByQuery = (objectFilter, task) => {
  let collection = []
  let conclusion = false

  if (objectFilter.o) {
    objectFilter.o.forEach((obj) => {
      testCoincidenceDataByQuery(obj, task)
      if (obj.t && obj.o) {
        collection.push(testCoincidenceDataByQuery(obj, task))
      } else {
        if (obj.p != 'dueDate') {
          let expression = isAnyMutch(obj.v, getTaskData(task, obj.p))
          collection.push(expression)
        } else {
          let expression = isDataInRange(obj, task)
          collection.push(expression)
        }
      }
    })
  }
  switch (objectFilter.t) {
    case 'AND':
      conclusion = collection.reduce((acc, curr) => acc && curr)
      break
    case 'OR':
      conclusion = collection.reduce((acc, curr) => acc || curr)
      break
  }
  return conclusion
}
const testLine = (params, callback) => {
  let { filter, laneID, laneState } = params
  let tasks

  it(`Get data by line: ${laneID} success`, async () => {
    tasks = await getDataRequest(filter, {
      laneId: laneID,
      laneState: laneState,
    })
    expect(tasks.data).to.be.an('array')
  })

  after(() => {
    callback && callback(tasks)
  })
}
const testTask = (json, obj) => {
  let filter = json
  let task = obj

  it(`Testing task: ${task.basic.uid} for coincidence with JSON query filter`, function() {
    const isTestPass = testCoincidenceDataByQuery(filter, task)
    expect(isTestPass).to.be.true
    // setTimeout(done, 1500)
  })
}

describe('Test connection', () => {
  before(async () => {
    await context.connect()
  })
  describe('session is built', () => {
    it('JSESSIONID is present', () => {
      expect(context.cookies.join(';'))
        .to.include('JSESSIONID')
        .and.to.include('3dspace')
    })
    it('CASTGC is present', () => {
      expect(context.cookies.join(';')).to.include('CASTGC')
    })
  })
})

// const testAccesLine = (board) => {
//   let boardID = board.id
//   it(`Test acces to lines in board ${boardID}`, async () => {
//     await CONFIG.getLanes(boardID)

//     let status = CONFIG.LANES.success
//     let lanes = CONFIG.LANES.data.lanes

//     expect(status).to.be.true
//     expect(lanes).to.be.an('array')
//     expect(lanes).to.not.be.empty
//   })
// }

describe('Test for accessibility data ', () => {
  it(`Test access to boards`, async function() {
    try {
      await CONFIG.getBoards()
    } catch (error) {
      console.log(error)
    }
    let status = CONFIG.BOARDS.success
    expect(status).to.be.true
  })

  it(`Test access to lines`, async function() {
    try {
      await CONFIG.getLanes(CONFIG.BOARDS.data[0].id)
    } catch (error) {
      console.log(error)
    }

    let status = CONFIG.LANES.success
    let lanes = CONFIG.LANES.data.lanes

    expect(status).to.be.true
    expect(lanes).to.be.an('array')
    expect(lanes).to.not.be.empty
  })
})

describe(`Test REST API`, function() {
  const filtersMap = FILTERS
  it(`Testing APi`, () => {
    filtersMap.forEach((filter, filterIndex) => {
      let lanes = CONFIG.LANES.data.lanes

      describe(`Test lines by filter ${++filterIndex}`, () => {
        lanes.forEach((lane) => {
          let laneState = lane.state
          let laneID = lane.id

          testLine({ filter, laneID, laneState }, (responseData) => {
            let tasks = responseData
            describe(`Test tasks by filter:${filterIndex}`, () => {
              tasks.data.forEach((task) => testTask(filter, task))
            })
          })
        })
      })
    })
  })
})

describe('Test different actions with tasks', function() {
  let testDataCreating = {
    title: `Created by automated test ❤`,
    percent: 20,
  }

  let testDataModify = {
    title: `😡Edit by automated test`,
    description: `Created by automated test. :)`,
  }

  testCreateNewTask(testDataCreating, (task) => {
    let current = task
    expect(current.data.basic.id).to.be.a('string').to.not.be.empty

    testAction('modify', current, testDataModify)

    testAction('add', current, { assignee: 'admin_platform' })
    testAction('add', current, { assignee: 'Test Everything' })

    // создает лист и добавляет значения
    testAction('add', current, { checklistName: 'Checklist name created by automated test' }, null, (task) => {
      testAction('addItem', task, { itemName: 'Item name created by automated test' })
    })

    // создает лист и добавляет значения
    testAction('add', current, { checklistName: '1 Checklist name created by automated test' }, null, (task) => {
      testAction('addItem', task, { itemName: '1 Item name created by automated test' })
    })

    testAction('add', current, { description: 'Comment created by automated test' }, 'Message')

    testAction('subscribe', current)

    // testAction('pushSubscription', current, { user: 'Test Everything' })

    // создает новую задачу и назначет ее на текущий таск
    describe(`Test add subtask to task`, () => {
      testCreateNewTask({ title: `Created by automated test` }, (task) => {
        let subtask = task

        testAction('add', current, { subtask: subtask.data.basic.id })
        testAction('remove', current, { subtask: subtask.data.basic.id })

        after(() => {
          DomainObject.deleteObject(context, subtask.data.basic.id)
        })
      })
    })
    // создает новую задачу и назначет ее на текущий таск
    describe(`Test add document to task`, () => {
      testCreateNewTask({ title: `Task as document` }, (task) => {
        let subtask = task

        testAction('add', current, { document: subtask.data.basic.id })
        testAction('remove', current, { subtask: subtask.data.basic.id })

        after(() => {
          DomainObject.deleteObject(context, subtask.data.basic.id)
        })
      })
    })

    testAction('setLine', current, {
      laneId: CONFIG.LANES.data.lanes[1].id,
      laneScheme: 'State',
      schemeType: 'Dynamic',
    })

    // testAction('unsubscribe', current)

    // testAction('modify', { isProjectTask: true })

    after(() => {
      DomainObject.deleteObject(context, current.data.basic.id)
    })
  })
})
