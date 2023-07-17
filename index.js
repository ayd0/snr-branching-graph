const canvas = document.querySelector("canvas");
const btnAddSubject = document.querySelector("#btn-add-subject");
const btnAddStep = document.querySelector("#btn-add-step");
const btnReset = document.querySelector("#btn-reset");
const btnSoftReset = document.querySelector("#btn-soft-reset");

if (canvas.getContext) {
    const ctx = canvas.getContext("2d");

    const canvasBounds = {
        height: canvas.height,
        width: canvas.width,
    };

    const subjectBox = {
        height: 30,
        width: 70,
    };

    const stepBox = {
        height: 25,
        width: 90,
    };

    const buffer = 10;
    const branchLine = buffer;

    const subjectBoxTop = buffer * 4;
    const subjectBoxLeft = buffer * 2;
    const subjectBoxLeftBuffer = subjectBox.width + buffer * 4;

    let numSubjects = 0;
    let selectedSubject;
    let numSteps = [];
    let clickables = [];
    let subjectState = [];
    let textState = [];

    const softReset = () => {
        ctx.reset();

        const currentSelectedSubject = selectedSubject;
        const currentNumSubjects = numSubjects;
        const currentNumSteps = numSteps.slice();
        clickables = [];
        subjectState = [];
        textState = [];

        for (let i = 0; i < numSteps.length; ++i) {
            numSteps[i] = 0;
        }

        for (let i = 0; i < currentNumSubjects; ++i) {
            numSubjects = i;
            createSubjectBox();

            selectedSubject = i;
            for (let j = 0; j < currentNumSteps[i]; ++j) {
                createStepBox(false);
            }
        }

        selectedSubject = currentSelectedSubject;

        initialize();
    };

    const createClickable = (left, top, width, height, subject) => {
        // TODO: handle clickables as clusters of items for greater selection
        //       hovering subjects highlights all steps
        //       hovering step highlights only step, etc...
        clickables.push({
            top: top,
            left: left,
            width: width,
            height: height,
            subject: subject,
        });
    };

    // handle clickables
    canvas.addEventListener("click", (e) => {
        const x = e.pageX - canvas.offsetLeft;
        const y = e.pageY - canvas.offsetTop;

        if (clickables.length > 0) {
            for (const clicked of clickables) {
                if (
                    x > clicked.left &&
                    x < clicked.left + clicked.width &&
                    y > clicked.top &&
                    y < clicked.top + clicked.height
                ) {
                    selectedSubject = clicked.subject;
                    console.log(`Clicked subject ${clicked.subject}`);
                }
            }
        }

        console.log(`X: ${x}, Y: ${y}`);
    });

    const createTopLineConnector = (offsetLeft) => {
        ctx.moveTo(
            subjectBoxLeft + subjectBoxLeftBuffer * numSubjects + offsetLeft,
            subjectBoxTop
        );
        ctx.lineTo(
            buffer +
                branchLine +
                subjectBoxLeftBuffer * numSubjects +
                offsetLeft,
            buffer
        );
    };


    const createBottomLineConnector = (left, top) => {
        ctx.moveTo(left + subjectBox.width / 2, top + subjectBox.height);
        ctx.lineTo(left + subjectBox.width / 2, canvasBounds.height);
    };

    const createBranchLine = (left, top, offsetLeft) => {
        if (!offsetLeft) offsetLeft = 0;
        ctx.moveTo(left + offsetLeft, top);
        ctx.lineTo(left + branchLine + offsetLeft, top);
    };

    const createSubjectState = () => {
        subjectState.push({
            extensions: 0,
        });
    };

    const getCumulativeExtensions = (subject) => {
        let extensionOffset = 0;
        if (numSubjects > 0) {
            for (let i = 0; i < subject; i++) {
                extensionOffset += subjectState[i].extensions;
            }
        }
        return extensionOffset;
    };

    const extendSubjectSection = (subject) => {
        // TK: DEV -> check if required
        ctx.beginPath()

        let cumulativeExtensionOffset =
            (branchLine * 2 + stepBox.width) *
            (getCumulativeExtensions(subject) + subject);

        let left =
            subjectBoxLeft +
            branchLine +
            subjectBox.width / 2 +
            cumulativeExtensionOffset;

        const top = subjectBoxTop + subjectBox.height;

        if (subjectState[subject].extensions > 1) {
            ctx.moveTo(
                left +
                    (stepBox.width + branchLine * 2) *
                        (subjectState[subject].extensions - 1),
                top
            );
        } else {
            ctx.moveTo(left, top);
        }

        left +=
            (stepBox.width + branchLine * 2) * subjectState[subject].extensions;

        ctx.lineTo(left, top);
        ctx.lineTo(left, canvasBounds.height);

        ctx.stroke();
    };

    const persistText = (styles, text, left, top) => {
        textState.push({
            styles,
            text,
            left,
            top,
        });
    };

    const drawPersistedText = () => {
        const text = textState[textState.length - 1];
        if (textState.length > 0) {
            ctx.beginPath()
            ctx.font = text.styles;
            ctx.fillStyle = "#000000";
            ctx.fillText(text.text, text.left, text.top);
        }
    }

    const clearAll = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

    const createSubjectBox = () => {
        const cumulativeExtensionOffset =
            (branchLine * 2 + stepBox.width) *
            getCumulativeExtensions(numSubjects);

        const left =
            subjectBoxLeft +
            branchLine +
            subjectBoxLeftBuffer * numSubjects +
            cumulativeExtensionOffset;
        const top = subjectBoxTop - subjectBox.height / 2;

        ctx.beginPath();
        ctx.fillStyle = "#EDF0F3"
        ctx.fillRect(left, top, subjectBox.width, subjectBox.height);
        
        ctx.beginPath();
        ctx.rect(left, top, subjectBox.width, subjectBox.height);

        createTopLineConnector(cumulativeExtensionOffset);
        createBranchLine(
            subjectBoxLeft + subjectBoxLeftBuffer * numSubjects,
            subjectBoxTop,
            cumulativeExtensionOffset
        );
        createBottomLineConnector(left, top);

        createSubjectState();
        createClickable(
            left,
            top,
            subjectBox.width,
            subjectBox.height,
            numSubjects
        );

        ctx.stroke();

        persistText(
            "15px serif",
            `Subject ${numSubjects}`,
            left + 5, // magic nonsense numbers will be updated
            top + subjectBox.width / 4
        );
        drawPersistedText();

        selectedSubject = numSubjects;
        ++numSubjects;
        numSteps.push(0);
    };

    const createStepBox = (resettable) => {
        if (resettable === undefined) resettable = true;
        if (numSteps[selectedSubject] > 0 && !(numSteps[selectedSubject] % 8)) {
            // For deleteStepBox, same principle but remove extension and rerender
            subjectState[selectedSubject].extensions++;
            extendSubjectSection(selectedSubject);
        }
        const cumulativeExtensionOffset =
            (branchLine * 2 + stepBox.width) *
            getCumulativeExtensions(selectedSubject);
        const extensionOffset =
            subjectState[selectedSubject].extensions *
            (branchLine * 2 + stepBox.width);
        let extended = extensionOffset > 0 ? true : false;

        const left =
            subjectBoxLeft +
            branchLine * 2 +
            subjectBox.width / 2 +
            subjectBoxLeftBuffer * selectedSubject +
            extensionOffset +
            cumulativeExtensionOffset;
        const top =
            subjectBoxTop * 2 +
            (extended
                ? numSteps[selectedSubject] % 8
                : numSteps[selectedSubject]) *
                subjectBoxTop;

        ctx.fillStyle = "#D9D9D9"
        ctx.fillRect(left, top, stepBox.width, stepBox.height);

        ctx.beginPath();
        ctx.rect(left, top, stepBox.width, stepBox.height);

        createBranchLine(
            left - branchLine,
            top + Math.ceil(subjectBox.height / 2) - 2 // magic number accounts for stupid floating point crap I don't know how to fix
        );

        createClickable(
            left,
            top,
            stepBox.width,
            stepBox.height,
            selectedSubject
        );

        ctx.stroke();

        persistText(
            "12px serif",
            `Step ${numSteps[selectedSubject]}`,
            left + 4, // magic nonsense numbers will be updated
            top + stepBox.width / 6
        );
        drawPersistedText();

        ++numSteps[selectedSubject];
        if (extended && resettable && !((numSteps[selectedSubject] - 1) % 8))
            softReset();
    };

    btnAddSubject.addEventListener("click", () => createSubjectBox());
    btnAddStep.addEventListener("click", () => createStepBox());

    const initialize = () => {
        // Top Line
        ctx.beginPath();

        ctx.moveTo(buffer, buffer);
        ctx.lineTo(canvasBounds.width - buffer, buffer);
        ctx.font = "20px serif";

        ctx.stroke();
    };

    btnSoftReset.addEventListener("click", () => softReset());

    const hardReset = () => {
        ctx.reset();

        numSubjects = 0;
        selectedSubject = 0;
        numSteps = [];
        clickables = [];
        subjectState = [];
        textState = [];

        initialize();
    };

    btnReset.addEventListener("click", () => hardReset());

    initialize();
}
