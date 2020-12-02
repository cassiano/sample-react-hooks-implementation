import React from "react"
import ReactDOM from "react-dom"

function replacer(name, val) {
  if (typeof val === "function") {
    return "= fn()"
  } else if (val === undefined) {
    return "= undefined"
  } else {
    return val // return as is
  }
}

const MyReact = (function () {
  let hooks = []
  let cursor = 0
  let component = null
  let rootElement = null

  //////////////////////////////////
  // Private/internal function(s) //
  //////////////////////////////////

  const _createSetter = (cursorPosition) => (newValueOrFunction) => {
    const previousValue = hooks[cursorPosition].value
    const newValue =
      typeof newValueOrFunction === "function"
        ? newValueOrFunction(previousValue)
        : newValueOrFunction

    // Avoid an unnecessary render when the value does not change.
    if (!Object.is(previousValue, newValue)) {
      hooks[cursorPosition].value = newValue

      _renderComponent()
    }
  }

  const _renderComponent = () => {
    ReactDOM.render(React.createElement(component), rootElement)

    cursor = 0
  }

  const _arrayAny = function (array, fn) {
    return !array.every((item, i) => !fn(item, i))
  }

  const _depsChanged = (currentDeps, previousDeps) =>
    previousDeps
      ? _arrayAny(currentDeps, (dep, i) => !Object.is(dep, previousDeps[i]))
      : true

  ////////////////////////
  // Public function(s) //
  ////////////////////////

  const useState = (initialValueOrFn) => {
    if (cursor === hooks.length) {
      const initialValue =
        typeof initialValueOrFn === "function"
          ? initialValueOrFn()
          : initialValueOrFn

      // Keep the setter stable, by saving it in the array along with the (initial) value.
      hooks[cursor] = {
        value: initialValue,
        setter: _createSetter(cursor)
      }
    }

    const { value, setter } = hooks[cursor] // type: { value: any, setter: function }

    cursor++

    return [value, setter]
  }

  const render = (newComponent, newRootElement) => {
    component = newComponent
    rootElement = newRootElement

    _renderComponent()
  }

  const useEffect = (effectFn, deps) => {
    const hasNoDeps = deps === undefined
    const { deps: previousDeps, cleanupFn: previousCleanupFn } =
      hooks[cursor] || {} // type: { deps: array | undefined, cleanupFn: function | undefined }

    // Should we (re)run the effect function?
    if (hasNoDeps || _depsChanged(deps, previousDeps)) {
      // Cleanup the previous effect before executing the current one, if applicable.
      if (previousCleanupFn) previousCleanupFn()

      const cleanupFn = effectFn()
      hooks[cursor] = { deps, cleanupFn }
    }

    cursor++
  }

  const useRef = (initialValue) => useState({ current: initialValue })[0]

  const useReducer = (reducerFn, initialArg, initializationFn) => {
    const [reducerState, setReducerState] = useState(
      initializationFn !== undefined ? initializationFn(initialArg) : initialArg
    )

    // const dispatchFn = (action) => {
    //   setReducerState((previousReducerState) => reducerFn(previousReducerState, action))
    // }

    /* eslint-disable */
    const dispatchFn = useCallback((action) => {
      setReducerState((previousReducerState) =>
        reducerFn(previousReducerState, action)
      )
    }, [])
    /* eslint-enable */

    return [reducerState, dispatchFn]
  }

  const useMemo = (memoizedFn, deps) => {
    const hasNoDeps = deps === undefined
    const { deps: previousDeps, value: previousValue } = hooks[cursor] || {} // type: undefined | array
    let value = previousValue

    // Should we (re)run the memoized function?
    if (hasNoDeps || _depsChanged(deps, previousDeps)) {
      value = memoizedFn()

      hooks[cursor] = { deps, value }
    }

    cursor++

    return value
  }

  /* eslint-disable */
  const useCallback = (callbackFn, deps) => useMemo(() => callbackFn, deps)
  /* eslint-enable */

  // Expose only our public functions.
  return {
    useState,
    useEffect,
    useRef,
    useReducer,
    useMemo,
    useCallback,
    render,
    hooks // For debugging purposes only!
  }
})()

// Import functions from the MyReact module.
const {
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback
} = MyReact

function useSplitURL(str) {
  const [text, setText] = useState(str)
  const masked = text.split(".")

  return [masked, setText]
}

const Counter = () => {
  // Hook with index 0
  const [count1, setCount1] = useState(10)

  // Hook with index 1
  const [count2, setCount2] = useState(20)

  // Hook with index 2
  const [count3, setCount3] = useState(30)

  // Hook with index 3
  const [text, setText] = useSplitURL("www.netlify.com")

  // Hook with index 4
  const myRef = useRef(0)

  // Hook with index 5
  const myMemo = useMemo(() => {
    console.log("(Re)calculating myMemo...")

    return count1 + count2 + count3
  }, [count1, count2, count3])

  // Hook with index 6
  useEffect(() => {
    console.log(
      "Running useEffect() #1. It should run only in the 1st render..."
    )
  }, [])

  // Hook with index 7
  useEffect(() => {
    console.log("Running useEffect() #2. It should ALWAYS run...")
  })

  // Hook with index 8
  useEffect(() => {
    console.log(
      "Running useEffect() #3. It should run whenever count2 or count3 change..."
    )

    myRef.current += 1

    // const timerId = setInterval(() => {
    //   console.log(`Running timer at ${new Date()}`)
    // }, 3000)

    return () => {
      console.log("Running useEffect #3's cleanup function...")

      // if (timerId) {
      //   console.log("Cleaning up interval...")
      //   clearInterval(timerId)
      // }
    }
  }, [count2, count3])

  const count4Data = {
    initialValue: 50,
    initFn: (initialCount) => ({ count: initialCount }),
    reducer: (state, action) => {
      switch (action.type) {
        case "increment":
          return { count: state.count + 1 }
        case "decrement":
          return { count: state.count - 1 }
        case "reset":
          return count4Data.initFn(action.payload)
        default:
          throw new Error()
      }
    }
  }

  // Hook with indices 9 & 10
  const [count4, count4Dispatch] = useReducer(
    count4Data.reducer,
    count4Data.initialValue,
    count4Data.initFn
  )

  return (
    <>
      <div>
        1st count is: {count1}{" "}
        <button onClick={() => setCount1(count1 - 1)}>-</button>
        <button onClick={() => setCount1(count1 + 1)}>+</button>
      </div>
      <div>
        2nd count is: {count2}{" "}
        <button onClick={() => setCount2(count2 - 1)}>-</button>
        <button onClick={() => setCount2((previousCount) => previousCount + 1)}>
          +
        </button>
      </div>
      <div>
        3rd count is: {count3}{" "}
        <button onClick={() => setCount3(count3 - 1)}>-</button>
        <button onClick={() => setCount3(count3 + 1)}>+</button>
        <button onClick={() => setCount3(count3)}>Keep the same</button>
      </div>
      <>
        4th count: {count4.count}{" "}
        <button onClick={() => count4Dispatch({ type: "decrement" })}>-</button>
        <button onClick={() => count4Dispatch({ type: "increment" })}>+</button>
        <button
          onClick={() =>
            count4Dispatch({ type: "reset", payload: count4Data.initialValue })
          }
        >
          Reset
        </button>
      </>
      <div>
        Text is: {text.join(" + ")}{" "}
        <button onClick={() => setText("reactjs.org")}>Replace text</button>
      </div>
      <div>myRef is: {myRef.current}</div>
      <div>myMemo is: {myMemo}</div>

      {/* For debugging purposes only! */}
      <hr />
      <div>
        <xmp>
          Hooks array (shown as an Object whose keys are the array indices):{" "}
          {JSON.stringify(
            MyReact.hooks.reduce((acc, item, i) => ({ ...acc, [i]: item }), {}),
            replacer,
            2
          )}
        </xmp>
      </div>
    </>
  )
}

const rootElement = document.getElementById("root")
MyReact.render(Counter, rootElement)
