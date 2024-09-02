$(document).ready(async function () {

    async function extractMajors() {
        const majors = [];

        $('span[data-bind="text: name, click: $root.showMajor, css: { \'fw-bold\': $root.currentMajor() === $data.key }"]').each(function () {
            const name = $(this).text().trim();
            majors.push({ name, element: $(this) });
        });

        return majors;
    }

    async function extractCoursesByComponent(componentIndex) {
        const componentButton = $(`button[data-bs-target="#RC${componentIndex}_Name"]`);
        const componentName = componentButton.text().trim();

        const courses = $(`ol[data-bind="foreach: dsCourses_RC${componentIndex}"] li span`)
            .map(function () { return $(this).text().trim(); })
            .get();

        return { [componentName]: courses };
    }

    async function extractCourseDetails(courseElements) {
        const courseDetailsList = [];

        async function extractSingleCourseDetails(courseElement) {
            $(courseElement).click();

            return new Promise(resolve => {
                const interval = setInterval(() => {
                    const detailLabels = $('.mt-5 dl.row dt');
                    if (detailLabels.length > 0) {
                        clearInterval(interval);
                        const courseDetails = {};

                        detailLabels.each(function () {
                            const key = $(this).text().trim().replace(':', '');
                            const value = $(this).next('dd').find('strong').text().trim();
                            courseDetails[key] = value;
                        });

                        const creditsElement = $('.mt-5 dl.row dt').filter(function () {
                            return $(this).text().trim() === 'Credit points:';
                        }).next('dd');

                        courseDetails['Credit points'] = creditsElement.find('strong').first().text().trim();
                        courseDetails['Credits theory'] = creditsElement.find('strong').eq(1).text().trim();
                        courseDetails['Credits laboratory'] = creditsElement.find('strong').eq(2).text().trim();
                        courseDetails['Credits ECTS'] = creditsElement.find('strong').last().text().trim();

                        courseDetailsList.push(courseDetails);

                        $('span[data-bind="click: viewList"]').click();
                        resolve();
                    }
                }, 100);
            });
        }

        for (let i = 0; i < courseElements.length; i++) {
            await extractSingleCourseDetails(courseElements[i]);
        }

        return courseDetailsList;
    }

    async function extractMajorData(majorElement) {
        majorElement.click();

        const coursesByComponent = {};
        for (let i = 1; i <= 5; i++) {
            Object.assign(coursesByComponent, await extractCoursesByComponent(i));
        }

        const courseElements = $('span[data-bind="text: fullName, click: $root.viewDetails"]');
        const courseDetails = await extractCourseDetails(courseElements);

        return { coursesByComponent, courseDetails };
    }

    async function extractAllMajors() {
        const allMajorsData = {};
        const majors = await extractMajors();
        const majorNamesList = majors.map(major => major.name);

        for (const major of majors) {
            const { name, element } = major;
            allMajorsData[name] = await extractMajorData(element);
        }

        allMajorsData['Majors'] = majorNamesList;
        return allMajorsData;
    }

    async function mergeArrays(array1, array2) {
        const mergedArray = [...array1, ...array2];
        const uniqueObjects = new Map();

        mergedArray.forEach(obj => {
            const objString = JSON.stringify(obj);
            if (!uniqueObjects.has(objString)) {
                uniqueObjects.set(objString, obj);
            }
        });

        return Array.from(uniqueObjects.values());
    }

    async function combineAllMajors() {
        const allMajorsData = await extractAllMajors();

        const courseDetails = await mergeArrays(...Object.values(allMajorsData)
            .filter(data => data.courseDetails)
            .map(data => data.courseDetails));

        const coursesByComponent = {};
        for (const data of Object.values(allMajorsData)) {
            if (data.coursesByComponent) {
                for (const [component, courses] of Object.entries(data.coursesByComponent)) {
                    if (!coursesByComponent[component]) coursesByComponent[component] = [];
                    coursesByComponent[component] = await mergeArrays(coursesByComponent[component], courses);
                }
            }
        }

        allMajorsData['allCourses'] = { courseDetails, coursesByComponent };
        return allMajorsData;
    }

    const allMajorsData = await combineAllMajors();
    console.log(allMajorsData);
});
