// yarn test packages/react-dom/src/__tests__/AsyncAct-test.js  --watchAll
const React = require('react');
const ReactDOM = require('react-dom');
const ReactTestUtils = require('react-dom/test-utils');

const COUNT = 200;
const iterations = Array(COUNT)
  .fill(null)
  .map((_, n) => n);

const TIMEOUT = 1;
const DIFF = 1;

const mountedContainers = new Set();

function getContainer() {
  const container = document.body.appendChild(document.createElement('div'));
  mountedContainers.add(container);
  return container;
}

function cleanup(container) {
  ReactTestUtils.act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
  if (container.parentNode === document.body) {
    document.body.removeChild(container);
  }
  mountedContainers.delete(container);
}

beforeEach(() => jest.useRealTimers());
afterEach(() => mountedContainers.forEach(cleanup));

function waitFor(callback) {
  return (
    // Immediate sync call
    callback() ||
    // Async call + interval + mutation observer
    new Promise(resolve => {
      let intervalId = null;
      let observer = null;

      function checkCallback() {
        const element = callback();
        if (element) {
          clearInterval(intervalId);
          observer.disconnect();
          resolve(element);
        }
      }

      intervalId = setInterval(checkCallback, 1);
      observer = new MutationObserver(checkCallback);
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      checkCallback();
    })
  );
}

function Component() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer1 = setTimeout(() => setVisible(true), TIMEOUT);
    const timer2 = setTimeout(() => setVisible(false), TIMEOUT + DIFF);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return <div>{visible && <span id="test">Content</span>}</div>;
}

// eslint-disable-next-line no-for-of-loops/no-for-of-loops
for (const i of iterations) {
  test(`unstable test ${1 + i}`, async () => {
    const container = getContainer();

    ReactTestUtils.act(() => {
      ReactDOM.render(<Component />, container);
    });

    let element = null;
    await ReactTestUtils.act(
      async () => {
        element = await waitFor(() => document.getElementById('test'));

        // Always pass
        expect(element.closest('body')).toBeTruthy(); // = toBeInTheDocument
      },
      {flushTasksBeforeExit: false},
    );

    // Randomly fails
    expect(element.closest('body')).toBeTruthy(); // = toBeInTheDocument
  });
}
