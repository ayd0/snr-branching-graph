const canvas = document.querySelector("canvas");
const btnAddSubject = document.querySelector("#btn-add-subject");
const btnAddStep = document.querySelector("#btn-add-step");
const btnDeleteSubject = document.querySelector("#btn-delete-subject");
const btnDeleteStep = document.querySelector("#btn-delete-step");
const btnReset = document.querySelector("#btn-reset");
const btnSoftReset = document.querySelector("#btn-soft-reset");

// ==============================================================================
// TODO: * handle anchoring text to elements, conditional abbreviations, etc.
// ------- * look into getting width of text, potentially monospace if neccessary
// ----- * add configuration options for shadows, color, etc.
// ----- * add CRUD operations for elements and state values
// ----- * fix issue with only first subject's calls to createStepBox() extending topLine while being last subject box
// ----- * make boxes not look like Windows XP
// ==============================================================================

if (canvas.getContext) {
    const ctx = canvas.getContext("2d");

    canvas.width = 200;

    const initialBounds = {
        height: canvas.height,
        width: canvas.width,
    };

    const subjectBox = {
        height: 30,
        width: 70,
        bezierControl: 30,
    };

    const stepBox = {
        height: 25,
        width: 90,
        bezierControl: 10,
    };

    const buffer = 10;
    const branchLine = buffer;

    const subjectBoxTop = buffer * 4;
    const subjectBoxLeft = buffer * 2;
    const subjectBoxLeftBuffer = subjectBox.width + buffer * 4;

    // Used to calculate total width in a complete branch structure: secSub + secStep + secExtStep
    //      -> For calculating top-line extensions
    const sectionSubject = branchLine + subjectBox.width;
    const sectionStep =
        branchLine * 2 + subjectBox.width / 2 + stepBox.width - sectionSubject;
    const sectionExtendedStep = branchLine * 2 + stepBox.width;

    const boxShadowOffset = 2;

    let totalExtendedDistance = 0;
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
        // TODO: * handle clickables as clusters of items for greater selection
        //------ * hovering subjects highlights all steps
        //------ * hovering step highlights only step, etc...
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
        const x =
            e.pageX -
            canvas.offsetLeft -
            (Math.ceil(canvas.getBoundingClientRect().x) - canvas.offsetLeft);
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
        ctx.lineTo(left + subjectBox.width / 2, initialBounds.height);
    };

    const createBranchLine = (left, top, offsetLeft) => {
        if (!offsetLeft) offsetLeft = 0;
        ctx.moveTo(left + offsetLeft, top);
        ctx.lineTo(left + branchLine + offsetLeft, top);
    };

    const cycleColorScheme = () => {
        const colorScheme = ["#A3A1F4", "#F2B9B9", "#C1E27A", "#EC98D9"];
        const selector = numSubjects % colorScheme.length;

        return colorScheme[selector];
    };

    const createSubjectState = () => {
        subjectState.push({
            extensions: 0,
            color: cycleColorScheme(),
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
        ctx.beginPath();

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
        ctx.lineTo(left, initialBounds.height);

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
            ctx.beginPath();
            ctx.font = text.styles;
            ctx.fillStyle = "#000000";
            ctx.fillText(text.text, text.left, text.top);
        }
    };

    const extendCanvasSection = () => {
        if (totalExtendedDistance > canvas.width) {
            canvas.width = totalExtendedDistance + buffer * 3;
            softReset();
        }
    };

    const calculateTotalExtendedDistance = () => {
        // Total value of all subject sections + subject left offsets
        totalExtendedDistance = numSubjects * sectionSubject;
        totalExtendedDistance +=
            (numSubjects - 1) * (subjectBoxLeftBuffer - sectionSubject);
        // Last subject section's step
        totalExtendedDistance += sectionStep;
        // Total cumulative extensions
        for (const state of subjectState) {
            totalExtendedDistance += state.extensions * sectionExtendedStep;
        }

        extendCanvasSection();
    };

    const createCurvedCap = (
        isLeft,
        fillStyle,
        control,
        left,
        top,
        width,
        height
    ) => {
        if (isLeft) {
            width = 0;
            control -= control * 2;
        }
        ctx.beginPath();
        ctx.fillStyle = fillStyle;
        ctx.bezierCurveTo(
            left + width,
            top,
            left + width + control,
            (top + height - top) / 2 + top,
            left + width,
            top + height
        );
        ctx.fill();
    };

    const createStepBoxCaps = (fillStyle, left, top) => {
        ctx.globalAlpha = 0.5;
        createCurvedCap(
            false,
            fillStyle,
            stepBox.bezierControl,
            left + boxShadowOffset,
            top + boxShadowOffset,
            stepBox.width,
            stepBox.height
        );
        createCurvedCap(
            true,
            fillStyle,
            stepBox.bezierControl,
            left + boxShadowOffset,
            top + boxShadowOffset,
            stepBox.width,
            stepBox.height
        );
        ctx.globalAlpha = 1.0;
        createCurvedCap(
            false,
            fillStyle,
            stepBox.bezierControl,
            left,
            top,
            stepBox.width,
            stepBox.height
        );
        createCurvedCap(
            true,
            fillStyle,
            stepBox.bezierControl,
            left,
            top,
            stepBox.width,
            stepBox.height
        );
    };

    const createBoxShadow = (fillStyle, opacity, left, top, width, height) => {
        ctx.fillStyle = fillStyle;
        ctx.globalAlpha = opacity;
        ctx.fillRect(
            left + boxShadowOffset,
            top + boxShadowOffset,
            width,
            height
        );
    };

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

        createSubjectState();
        const fillColor = subjectState[numSubjects].color;

        createBoxShadow(
            fillColor,
            0.5,
            left,
            top,
            subjectBox.width,
            subjectBox.height
        );
        ctx.globalAlpha = 1.0;
        ctx.fillRect(left, top, subjectBox.width, subjectBox.height);

        ctx.beginPath();
        // ctx.rect(left, top, subjectBox.width, subjectBox.height);

        createTopLineConnector(cumulativeExtensionOffset);
        createBranchLine(
            subjectBoxLeft + subjectBoxLeftBuffer * numSubjects,
            subjectBoxTop,
            cumulativeExtensionOffset
        );
        createBottomLineConnector(left, top);

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
        calculateTotalExtendedDistance();
        numSteps.push(0);
    };

    const createStepBox = (resettable) => {
        let sessionExtended = false;
        // ^ extended within the current function call
        if (resettable === undefined) resettable = true;
        if (numSteps[selectedSubject] > 0 && !(numSteps[selectedSubject] % 8)) {
            // For deleteStepBox, same principle but remove extension and rerender
            subjectState[selectedSubject].extensions++;
            extendSubjectSection(selectedSubject);
            sessionExtended = true;
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

        const fillColor = subjectState[selectedSubject].color;

        ctx.beginPath();
        createBranchLine(
            left - branchLine,
            top + Math.ceil(subjectBox.height / 2) - 2 // magic number accounts for stupid floating point crap I don't know how to fix
        );
        ctx.stroke();

        // hacky implementation of shadows and curved caps, revise

        createBoxShadow(
            fillColor,
            0.5,
            left,
            top,
            stepBox.width,
            stepBox.height
        );

        createStepBoxCaps(fillColor, left, top);

        ctx.fillRect(left, top, stepBox.width, stepBox.height);

        ctx.beginPath();

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
        if (extended && resettable && !((numSteps[selectedSubject] - 1) % 8)) {
            calculateTotalExtendedDistance();
        }

        if (sessionExtended && resettable) softReset();
    };

    // Eventually delete requests will be handled on specific step by UUID when merged to website
    const deleteSubject = () => {
        if (numSubjects > 0) {
            numSteps.splice(selectedSubject, 1);
            numSubjects--;
            canvas.width = totalExtendedDistance + buffer * 3;
            if (selectedSubject === numSubjects) {
                selectedSubject = numSubjects - 1;
            } else if (selectedSubject > 1) {
                selectedSubject = selectedSubject - 1;
            }
            softReset();
        }
    };

    const deleteStep = () => {
        if (numSteps[selectedSubject] > 0) {
            numSteps[selectedSubject]--;
            canvas.width = totalExtendedDistance + buffer * 3;
            softReset();
        }
    };

    btnAddSubject.addEventListener("click", () => createSubjectBox());
    btnAddStep.addEventListener("click", () => createStepBox());
    btnDeleteSubject.addEventListener("click", () => deleteSubject());
    // update step clickable handling for uuid
    btnDeleteStep.addEventListener("click", () => deleteStep());

    const initialize = () => {
        // Top Line
        ctx.beginPath();

        ctx.moveTo(buffer, buffer);
        ctx.lineTo(
            initialBounds.width > totalExtendedDistance
                ? canvas.width
                : totalExtendedDistance + buffer * 2,
            buffer
        );

        ctx.stroke();
    };

    btnSoftReset.addEventListener("click", () => softReset());

    const hardReset = () => {
        ctx.reset();

        totalExtendedDistance = 0;
        numSubjects = 0;
        selectedSubject = undefined;
        numSteps = [];
        clickables = [];
        subjectState = [];
        textState = [];
        canvas.width = initialBounds.width;

        initialize();
    };

    btnReset.addEventListener("click", () => hardReset());

    initialize();
}
