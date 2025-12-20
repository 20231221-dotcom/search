const searchInput = document.getElementById('searchInput');
const searchbox = document.querySelector('.searchbox');
const canvas = document.getElementById('canvas');

// 円の位置を取得する関数 - 完全修正版
function getCirclePosition(circle) {
    const leftStr = circle.style.left;
    const topStr = circle.style.top;

    let left = 0;
    let top = 0;

    // left の解析（+ と - の両方に対応）
    if (leftStr && leftStr.includes('calc')) {
        // calc(50% + XXXpx) または calc(50% - XXXpx) の形式
        const matchPlus = leftStr.match(/calc\(50%\s*\+\s*(-?[\d.e+-]+)px\)/);
        const matchMinus = leftStr.match(/calc\(50%\s*-\s*([\d.e+-]+)px\)/);

        if (matchPlus) {
            left = parseFloat(matchPlus[1]);
        } else if (matchMinus) {
            left = -parseFloat(matchMinus[1]);
        }
    }

    // top の解析（+ と - の両方に対応）
    if (topStr && topStr.includes('calc')) {
        // パターン1: calc(50% + 300px + XXXpx)
        const match1Plus = topStr.match(/calc\(50%\s*\+\s*300px\s*\+\s*(-?[\d.e+-]+)px\)/);
        const match1Minus = topStr.match(/calc\(50%\s*\+\s*300px\s*-\s*([\d.e+-]+)px\)/);

        // パターン2: calc(50% + XXXpx)
        const match2Plus = topStr.match(/calc\(50%\s*\+\s*(-?[\d.e+-]+)px\)/);
        const match2Minus = topStr.match(/calc\(50%\s*-\s*([\d.e+-]+)px\)/);

        if (match1Plus) {
            top = parseFloat(match1Plus[1]);
        } else if (match1Minus) {
            top = -parseFloat(match1Minus[1]);
        } else if (match2Plus) {
            top = parseFloat(match2Plus[1]) - 300;
        } else if (match2Minus) {
            top = -parseFloat(match2Minus[1]) - 300;
        }
    }

    const width = parseFloat(circle.style.width) || 0;
    const height = parseFloat(circle.style.height) || 0;
    const radius = Math.max(width, height) / 2;

    return { x: left, y: top, radius: radius, element: circle };
}

// 円の全ての子円を取得する関数（拡大済みの円は除外オプション付き）
function getChildCircles(parentCircle, excludeExpanded = false) {
    const children = [];
    const parentId = parentCircle.dataset.circleId;

    if (!parentId) return children;

    const allCircles = document.querySelectorAll('.keyword-circle');
    allCircles.forEach(circle => {
        if (circle.dataset.parentId === parentId) {
            if (excludeExpanded && circle.dataset.clicked === 'true' && parseFloat(circle.style.width) >= 150) {
                return;
            }
            children.push(circle);
        }
    });

    return children;
}

// 円を親円の周りで回転させる関数
function rotateCircleAroundParent(circle, parentX, parentY, angleChange) {
    const currentPos = getCirclePosition(circle);

    const dx = currentPos.x - parentX;
    const dy = currentPos.y - parentY;

    const currentAngle = Math.atan2(dy, dx);
    const radius = Math.sqrt(dx * dx + dy * dy);

    const newAngle = currentAngle + angleChange;

    const newX = parentX + Math.cos(newAngle) * radius;
    const newY = parentY + Math.sin(newAngle) * radius;

    circle.style.left = `calc(50% + ${newX}px)`;
    circle.style.top = `calc(50% + 300px + ${newY}px)`;

    const lineId = circle.dataset.lineId;
    if (lineId) {
        const line = document.querySelector(`[data-circle-id="${lineId}"]`);
        if (line) {
            line.style.left = `calc(50% + ${parentX}px)`;
            line.style.top = `calc(50% + 300px + ${parentY}px)`;
            line.style.height = radius + 'px';
            line.style.transform = `translate(-50%, 0) rotate(${newAngle - Math.PI / 2}rad)`;
        }
    }

    const children = getChildCircles(circle, true);
    children.forEach((child) => {
        const childCurrentPos = getCirclePosition(child);

        const childDx = childCurrentPos.x - currentPos.x;
        const childDy = childCurrentPos.y - currentPos.y;

        const childRelativeAngle = Math.atan2(childDy, childDx);
        const childRelativeDistance = Math.sqrt(childDx * childDx + childDy * childDy);

        const childNewRelativeAngle = childRelativeAngle + angleChange;

        const childRelativeX = Math.cos(childNewRelativeAngle) * childRelativeDistance;
        const childRelativeY = Math.sin(childNewRelativeAngle) * childRelativeDistance;
        const childNewX = newX + childRelativeX;
        const childNewY = newY + childRelativeY;

        child.style.left = `calc(50% + ${childNewX}px)`;
        child.style.top = `calc(50% + 300px + ${childNewY}px)`;

        const childLineId = child.dataset.lineId;
        if (childLineId) {
            const childLine = document.querySelector(`[data-circle-id="${childLineId}"]`);
            if (childLine) {
                childLine.style.left = `calc(50% + ${newX}px)`;
                childLine.style.top = `calc(50% + 300px + ${newY}px)`;

                const childLineDx = childNewX - newX;
                const childLineDy = childNewY - newY;
                const childLineLength = Math.sqrt(childLineDx * childLineDx + childLineDy * childLineDy);
                const childLineAngle = Math.atan2(childLineDy, childLineDx);

                childLine.style.height = childLineLength + 'px';
                childLine.style.transform = `translate(-50%, 0) rotate(${childLineAngle - Math.PI / 2}rad)`;
            }
        }

        const grandChildren = getChildCircles(child);
        if (grandChildren.length > 0) {
            rotateCircleAroundParent(child, newX, newY, angleChange);
        }
    });
}

// 点と線分の最短距離を計算する関数
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
}

// 線の位置情報を取得する関数
function getLinePosition(line) {
    const leftStr = line.style.left;
    const topStr = line.style.top;

    let startX = 0;
    let startY = 0;

    if (leftStr && leftStr.includes('calc')) {
        const matchPlus = leftStr.match(/calc\(50%\s*\+\s*(-?[\d.e+-]+)px\)/);
        const matchMinus = leftStr.match(/calc\(50%\s*-\s*([\d.e+-]+)px\)/);
        if (matchPlus) {
            startX = parseFloat(matchPlus[1]);
        } else if (matchMinus) {
            startX = -parseFloat(matchMinus[1]);
        }
    }

    if (topStr && topStr.includes('calc')) {
        const match1Plus = topStr.match(/calc\(50%\s*\+\s*300px\s*\+\s*(-?[\d.e+-]+)px\)/);
        const match1Minus = topStr.match(/calc\(50%\s*\+\s*300px\s*-\s*([\d.e+-]+)px\)/);
        const match2Plus = topStr.match(/calc\(50%\s*\+\s*(-?[\d.e+-]+)px\)/);
        const match2Minus = topStr.match(/calc\(50%\s*-\s*([\d.e+-]+)px\)/);

        if (match1Plus) {
            startY = parseFloat(match1Plus[1]);
        } else if (match1Minus) {
            startY = -parseFloat(match1Minus[1]);
        } else if (match2Plus) {
            startY = parseFloat(match2Plus[1]) - 300;
        } else if (match2Minus) {
            startY = -parseFloat(match2Minus[1]) - 300;
        }
    }

    const height = parseFloat(line.style.height) || 0;
    const transformStr = line.style.transform || '';
    const rotateMatch = transformStr.match(/rotate\((-?[\d.e+-]+)rad\)/);
    const angle = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

    const lineAngle = angle + Math.PI / 2;
    const endX = startX + Math.cos(lineAngle) * height;
    const endY = startY + Math.sin(lineAngle) * height;

    return { startX, startY, endX, endY, length: height };
}

// 衝突回避処理を実行する関数
function avoidCollision(circle, expandingPos, circlePos, angleChange = Math.PI / 16) {
    if (circle.dataset.avoiding === 'true') {
        return;
    }

    circle.dataset.avoiding = 'true';

    const parentId = circle.dataset.parentId;
    let parentX = 0;
    let parentY = 0;

    if (parentId && parentId !== 'root') {
        const parentCircle = document.querySelector(`[data-circle-id="${parentId}"]`);
        if (parentCircle) {
            const parentPos = getCirclePosition(parentCircle);
            parentX = parentPos.x;
            parentY = parentPos.y;
        }
    }

    const circleDx = circlePos.x - parentX;
    const circleDy = circlePos.y - parentY;
    const currentCircleAngle = Math.atan2(circleDy, circleDx);

    const pushDx = circlePos.x - expandingPos.x;
    const pushDy = circlePos.y - expandingPos.y;
    const pushAngle = Math.atan2(pushDy, pushDx);

    const crossProduct = Math.sin(pushAngle - currentCircleAngle);

    const rotationDirection = crossProduct > 0 ? -1 : 1;

    const finalAngleChange = rotationDirection * angleChange;

    circle.style.transition = 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    const setTransitionRecursive = (parentCircle) => {
        const children = getChildCircles(parentCircle, true);
        children.forEach(child => {
            child.style.transition = 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            const childLineId = child.dataset.lineId;
            if (childLineId) {
                const childLine = document.querySelector(`[data-circle-id="${childLineId}"]`);
                if (childLine) {
                    childLine.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                }
            }
            setTransitionRecursive(child);
        });
    };
    setTransitionRecursive(circle);

    const parentLineId = circle.dataset.lineId;
    if (parentLineId) {
        const parentLine = document.querySelector(`[data-circle-id="${parentLineId}"]`);
        if (parentLine) {
            parentLine.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
    }

    rotateCircleAroundParent(circle, parentX, parentY, finalAngleChange);

    setTimeout(() => {
        circle.style.transition = 'none';
        circle.dataset.avoiding = 'false';

        if (parentLineId) {
            const parentLine = document.querySelector(`[data-circle-id="${parentLineId}"]`);
            if (parentLine) {
                parentLine.style.transition = 'none';
            }
        }
        const resetTransitionRecursive = (parentCircle) => {
            const children = getChildCircles(parentCircle);
            children.forEach(child => {
                child.style.transition = 'none';
                const childLineId = child.dataset.lineId;
                if (childLineId) {
                    const childLine = document.querySelector(`[data-circle-id="${childLineId}"]`);
                    if (childLine) {
                        childLine.style.transition = 'none';
                    }
                }
                resetTransitionRecursive(child);
            });
        };
        resetTransitionRecursive(circle);

        setTimeout(() => {
            circle.style.transition = '';
            if (parentLineId) {
                const parentLine = document.querySelector(`[data-circle-id="${parentLineId}"]`);
                if (parentLine) {
                    parentLine.style.transition = '';
                }
            }
            const restoreTransitionRecursive = (parentCircle) => {
                const children = getChildCircles(parentCircle, true);
                children.forEach(child => {
                    child.style.transition = '';
                    const childLineId = child.dataset.lineId;
                    if (childLineId) {
                        const childLine = document.querySelector(`[data-circle-id="${childLineId}"]`);
                        if (childLine) {
                            childLine.style.transition = '';
                        }
                    }
                    restoreTransitionRecursive(child);
                });
            };
            restoreTransitionRecursive(circle);
        }, 50);
    }, 700);
}

// 将来の拡大位置での衝突をチェックする関数
function willCollideWhenExpanded(x, y, parentX, parentY, angle) {
    const extendedRadius = 120 + 300;
    const expandedX = parentX + Math.cos(angle) * extendedRadius;
    const expandedY = parentY + Math.sin(angle) * extendedRadius;
    const expandedRadius = 75;

    const allCircles = document.querySelectorAll('.keyword-circle, .new-circle');
    const expandedCircles = Array.from(allCircles).filter(circle => {
        return circle.dataset.clicked === 'true' && parseFloat(circle.style.width) >= 150;
    });

    for (const circle of expandedCircles) {
        const circlePos = getCirclePosition(circle);
        const distance = Math.sqrt(
            Math.pow(expandedX - circlePos.x, 2) +
            Math.pow(expandedY - circlePos.y, 2)
        );
        const minDistance = expandedRadius + circlePos.radius + 160;

        if (distance < minDistance) {
            console.log(`Will collide with circle at angle ${angle * 180 / Math.PI}°`);
            return true;
        }
    }

    const allLines = document.querySelectorAll('.keyword-line, .line');
    for (const line of allLines) {
        const linePos = getLinePosition(line);

        if (linePos.length === 0) continue;

        const distance = pointToLineDistance(
            expandedX, expandedY,
            linePos.startX, linePos.startY,
            linePos.endX, linePos.endY
        );

        const minDistance = expandedRadius + 50;

        if (distance < minDistance) {
            console.log(`Will collide with line at angle ${angle * 180 / Math.PI}°`);
            return true;
        }
    }

    return false;
}

// 既存の小さい円を衝突チェックして非表示にする関数
function updateExistingSmallCircles() {
    const smallCircles = document.querySelectorAll('.keyword-circle');

    smallCircles.forEach(circle => {
        if (circle.dataset.clicked === 'true' && parseFloat(circle.style.width) >= 150) {
            return;
        }

        const parentId = circle.dataset.parentId;
        let parentX = 0;
        let parentY = 0;

        if (parentId && parentId !== 'root') {
            const parentCircle = document.querySelector(`[data-circle-id="${parentId}"]`);
            if (parentCircle) {
                const parentPos = getCirclePosition(parentCircle);
                parentX = parentPos.x;
                parentY = parentPos.y;
            }
        }

        const circlePos = getCirclePosition(circle);
        const dx = circlePos.x - parentX;
        const dy = circlePos.y - parentY;
        const angle = Math.atan2(dy, dx);

        if (willCollideWhenExpanded(circlePos.x, circlePos.y, parentX, parentY, angle)) {
            console.log(`Hiding existing circle at angle ${angle * 180 / Math.PI}° due to collision`);

            circle.style.transition = 'opacity 0.3s ease';
            circle.style.opacity = '0';

            const lineId = circle.dataset.lineId;
            if (lineId) {
                const line = document.querySelector(`[data-circle-id="${lineId}"]`);
                if (line) {
                    line.style.transition = 'opacity 0.3s ease';
                    line.style.opacity = '0';
                    setTimeout(() => line.remove(), 300);
                }
            }

            setTimeout(() => circle.remove(), 300);
        }
    });
}

// 円のクリックイベントを再帰的にアタッチする関数 - 完全修正版
function attachCircleClickHandler(circle, line, initialAngle, initialParentX, initialParentY, parentCircle = null) {
    circle.addEventListener('click', async function (e) {
        console.log("clicked");
        e.stopPropagation();
        if (this.dataset.clicked === 'true') return;

        this.dataset.clicked = 'true';

        const clickedCircle = this;
        const currentPos = getCirclePosition(clickedCircle);
        let parentX = initialParentX;
        let parentY = initialParentY;
        let angle = initialAngle;

        if (parentCircle) {
            const parentPos = getCirclePosition(parentCircle);
            parentX = parentPos.x;
            parentY = parentPos.y;

            const dx = currentPos.x - parentX;
            const dy = currentPos.y - parentY;
            angle = Math.atan2(dy, dx);

            clickedCircle.dataset.parentX = parentX;
            clickedCircle.dataset.parentY = parentY;
        }

        let shouldMoveToBottom = false;
        if (parentCircle) {
            const siblings = getChildCircles(parentCircle, false);
            const clickedSiblings = siblings.filter(sibling =>
                sibling !== clickedCircle && sibling.dataset.clicked === 'true'
            );

            if (clickedSiblings.length === 0) {
                shouldMoveToBottom = true;
            }
        }

        if (shouldMoveToBottom && parentCircle) {
            const parentPos = getCirclePosition(parentCircle);
            parentX = parentPos.x;
            parentY = parentPos.y;

            const dx = currentPos.x - parentPos.x;
            const dy = currentPos.y - parentPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const currentAngle = Math.atan2(dy, dx);

            const targetAngle = Math.PI / 2;
            const tempX = parentPos.x + Math.cos(targetAngle) * distance;
            const tempY = parentPos.y + Math.sin(targetAngle) * distance;

            const siblings = getChildCircles(parentCircle, false);
            let circleAt90Degrees = null;
            let minAngleDiff = Infinity;

            siblings.forEach(sibling => {
                if (sibling !== clickedCircle && sibling.dataset.clicked !== 'true') {
                    const siblingPos = getCirclePosition(sibling);
                    const siblingDx = siblingPos.x - parentPos.x;
                    const siblingDy = siblingPos.y - parentPos.y;
                    const siblingAngle = Math.atan2(siblingDy, siblingDx);

                    const angleDiff = Math.abs(siblingAngle - targetAngle);
                    if (angleDiff < 0.3 && angleDiff < minAngleDiff) {
                        minAngleDiff = angleDiff;
                        circleAt90Degrees = sibling;
                    }
                }
            });

            if (circleAt90Degrees) {
                const circle90Pos = getCirclePosition(circleAt90Degrees);
                const circle90Distance = Math.sqrt(
                    Math.pow(circle90Pos.x - parentPos.x, 2) +
                    Math.pow(circle90Pos.y - parentPos.y, 2)
                );

                const swapX = parentPos.x + Math.cos(currentAngle) * circle90Distance;
                const swapY = parentPos.y + Math.sin(currentAngle) * circle90Distance;

                circleAt90Degrees.style.transition = 'left 0.3s ease, top 0.3s ease';
                circleAt90Degrees.style.left = `calc(50% + ${swapX}px)`;
                circleAt90Degrees.style.top = `calc(50% + 300px + ${swapY}px)`;

                const circle90LineId = circleAt90Degrees.dataset.lineId;
                if (circle90LineId) {
                    const circle90Line = document.querySelector(`[data-circle-id="${circle90LineId}"]`);
                    if (circle90Line) {
                        circle90Line.style.transition = 'height 0.3s ease, transform 0.3s ease';
                        circle90Line.style.height = circle90Distance + 'px';
                        circle90Line.style.transform = `translate(-50%, 0) rotate(${currentAngle - Math.PI / 2}rad)`;
                    }
                }

                setTimeout(() => {
                    circleAt90Degrees.style.transition = '';
                    if (circle90LineId) {
                        const circle90Line = document.querySelector(`[data-circle-id="${circle90LineId}"]`);
                        if (circle90Line) {
                            circle90Line.style.transition = '';
                        }
                    }
                }, 300);
            }

            clickedCircle.style.transition = 'left 0.3s ease, top 0.3s ease';
            clickedCircle.style.left = `calc(50% + ${tempX}px)`;
            clickedCircle.style.top = `calc(50% + 300px + ${tempY}px)`;

            if (line) {
                line.style.transition = 'height 0.3s ease, transform 0.3s ease';
                line.style.height = distance + 'px';
                line.style.transform = `translate(-50%, 0) rotate(${targetAngle - Math.PI / 2}rad)`;
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            angle = targetAngle;
        }

        // テキストのフェードアウト
        const textElement = clickedCircle.querySelector('span');
        if (textElement) {
            textElement.style.transition = 'opacity 0.3s ease';
            textElement.style.opacity = '0';
        }

        setTimeout(() => {
            if (textElement) {
                textElement.remove();
            }

            const descriptionText = document.createElement('p');
            descriptionText.textContent = clickedCircle.dataset.description || '読み込み中...';
            descriptionText.style.color = 'white';
            descriptionText.style.fontSize = '10px';
            descriptionText.style.padding = '10px';
            descriptionText.style.maxWidth = '130px';
            descriptionText.style.wordWrap = 'break-word';
            descriptionText.style.textAlign = 'center';
            descriptionText.style.margin = '0';
            descriptionText.style.opacity = '0';

            clickedCircle.appendChild(descriptionText);
            setTimeout(() => {
                descriptionText.style.transition = 'opacity 0.3s ease';
                descriptionText.style.opacity = '1';
            }, 100);

            if (parentCircle) {
                const parentPos = getCirclePosition(parentCircle);
                parentX = parentPos.x;
                parentY = parentPos.y;
            }

            const radius = 120;
            const extendedRadius = radius + 300;
            const newX = Math.cos(angle) * extendedRadius;
            const newY = Math.sin(angle) * extendedRadius;

            const finalX = parentX + newX;
            const finalY = parentY + newY;

            console.log('Circle expansion:', {
                parent: { x: parentX, y: parentY },
                angle: angle * 180 / Math.PI,
                offset: { x: newX, y: newY },
                final: { x: finalX, y: finalY }
            });

            clickedCircle.style.transition = 'left 0.5s ease, top 0.5s ease, width 0.5s ease, height 0.5s ease, background-color 0.5s ease';
            clickedCircle.style.left = `calc(50% + ${finalX}px)`;
            clickedCircle.style.top = `calc(50% + 300px + ${finalY}px)`;
            clickedCircle.style.width = '150px';
            clickedCircle.style.height = '150px';
            clickedCircle.style.backgroundColor = '#ff69b4';

            const clickedPos = getCirclePosition(clickedCircle);
            focusCirclePosX = -clickedPos.x - 689.5;
            focusCirclePosY = -clickedPos.y - 750;
            setTimeout(() => {
                focusMove()
            }, 450);

            if (line) {
                const extendedLength = Math.sqrt(newX * newX + newY * newY);
                line.style.transition = 'height 0.5s ease, transform 0.5s ease';
                line.style.height = extendedLength + radius / 2 + 'px';
                line.style.transform = `translate(-50%, 0) rotate(${angle - Math.PI / 2}rad)`;
            }

            setTimeout(() => {
                updateExistingSmallCircles();
            }, 550);
            
            setTimeout(() => {
                const checkAndCreateSubCircles = () => {
                    const subKeywords = JSON.parse(clickedCircle.dataset.subKeywords || '[]');
                    if (subKeywords.length > 0) {
                        createSubCircles(clickedCircle, finalX, finalY);
                    } else {
                        console.log('Waiting for sub-keywords data...');
                        setTimeout(checkAndCreateSubCircles, 500);
                    }
                };
                checkAndCreateSubCircles();
            }, 550);
        }, 300);
    });
}  
    
//サブキーワードの円を作成する関数
function createSubCircles(parentCircle, parentX, parentY) {
    try {
        const subKeywords = JSON.parse(parentCircle.dataset.subKeywords || '[]');
        console.log('Creating sub-circles for:', subKeywords);

        if (subKeywords.length === 0) return;

        const subRadius = 120;

        const customAngles = [
            0,
            Math.PI / 4,
            Math.PI / 2,
            Math.PI * 3 / 4,
            Math.PI
        ];

        subKeywords.forEach((subKeyword, subIndex) => {
            let subAngle;
            if (customAngles[subIndex] !== undefined) {
                subAngle = customAngles[subIndex];
            } else {
                const angleStep = (Math.PI * 2) / subKeywords.length;
                const startAngle = -Math.PI / 2;
                subAngle = angleStep * subIndex + startAngle;
            }

            if (willCollideWhenExpanded(0, 0, parentX, parentY, subAngle)) {
                console.log(`Skipping circle at angle ${subAngle * 180 / Math.PI}° due to collision`);
                return;
            }

            const subX = Math.cos(subAngle) * subRadius;
            const subY = Math.sin(subAngle) * subRadius;

            const subLine = document.createElement('div');
            subLine.className = 'keyword-line';
            subLine.style.left = `calc(50% + ${parentX}px)`;
            subLine.style.top = `calc(50% + 300px + ${parentY}px)`;
            subLine.style.width = '2px';
            subLine.style.height = '0';
            subLine.style.background = 'white';
            subLine.style.position = 'absolute';
            subLine.style.transformOrigin = 'top center';

            const lineLength = subRadius;
            const rotationAngle = subAngle - Math.PI / 2;
            subLine.style.transform = `translate(-50%, 0) rotate(${rotationAngle}rad)`;

            canvas.appendChild(subLine);

            setTimeout(() => {
                subLine.style.transition = 'height 0.5s ease';
                subLine.style.height = lineLength + 'px';
            }, subIndex * 100);

            const subCircle = document.createElement('div');
            subCircle.className = 'keyword-circle';
            subCircle.style.left = `calc(50% + ${parentX + subX}px)`;
            subCircle.style.top = `calc(50% + 300px + ${parentY + subY}px)`;
            subCircle.style.width = '0';
            subCircle.style.height = '0';
            subCircle.style.borderRadius = '50%';
            subCircle.style.backgroundColor = '#ffeb3b';
            subCircle.style.position = 'absolute';
            subCircle.style.transform = 'translate(-50%, -50%)';
            subCircle.style.display = 'flex';
            subCircle.style.justifyContent = 'center';
            subCircle.style.alignItems = 'center';
            subCircle.style.overflow = 'hidden';
            subCircle.style.cursor = 'pointer';

            let subText;

            if (subIndex === 2) {
                subText = document.createElement('input');
                subText.type = 'text';
                subText.id = 'myTextBox';
                subText.name = 'username';
                subText.placeholder = '名前を入力してください';
                subText.className = 'form-input';
                subText.style.width = '50px';
                subText.style.height = '30px';
                let subKeyword = '';

                subText.addEventListener('input', function () {
                    subKeyword = subText.value;
                    console.log('更新されました:', subKeyword);
                });

                subText.addEventListener('click', function (e) {
                    e.stopPropagation();
                });

                subText.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        console.log("look", subKeyword);
                        subCircle.click();
                        fetchDescriptionAndKeywords(subKeyword, subCircle);
                        subText.style.display = "none";
                    }
                });
            } else {
                subText = document.createElement('span');
                subText.textContent = subKeyword;
                subText.style.fontSize = '11px';
                subText.style.fontWeight = 'bold';
                subText.style.color = '#333';
                subText.style.textAlign = 'center';
                subText.style.padding = '5px';
                subText.style.opacity = '0';
                fetchDescriptionAndKeywords(subKeyword, subCircle);
            }

            subCircle.appendChild(subText);

            const circleId = `circle-${Date.now()}-${subIndex}-${Math.random()}`;
            const lineId = `line-${Date.now()}-${subIndex}-${Math.random()}`;

            subCircle.dataset.keyword = subKeyword;
            subCircle.dataset.description = '';
            subCircle.dataset.subKeywords = '[]';
            subCircle.dataset.clicked = 'false';
            subCircle.dataset.circleId = circleId;
            subCircle.dataset.lineId = lineId;
            subCircle.dataset.parentId = parentCircle.dataset.circleId || 'root';

            subLine.dataset.circleId = lineId;

            canvas.appendChild(subCircle);

            attachCircleClickHandler(subCircle, subLine, subAngle, parentX + subX, parentY + subY, parentCircle);

            setTimeout(() => {
                subCircle.style.transition = 'width 0.3s ease, height 0.3s ease';
                subCircle.style.width = '80px';
                subCircle.style.height = '80px';

                setTimeout(() => {
                    subText.style.transition = 'opacity 0.3s ease';
                    subText.style.opacity = '1';
                }, 300);
            }, subIndex * 100 + 500);
        });
    } catch (error) {
        console.error('Error creating sub-circles:', error);
    }
}

// API呼び出し関数
async function fetchDescriptionAndKeywords(subKeyword, subCircle) {
    try {
        console.log(`Fetching description for: ${subKeyword}`);
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: subKeyword
            })
        });

        const data = await response.json();

        if (data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0]) {

            const description = data.candidates[0].content.parts[0].text;
            const keywords = data.keywords || [];

            subCircle.dataset.description = description;
            subCircle.dataset.subKeywords = JSON.stringify(keywords);

            console.log(`Saved data for: ${subKeyword}, keywords:`, keywords);

            if (subCircle.dataset.clicked === 'true') {
                const descText = subCircle.querySelector('p');
                if (descText && descText.textContent === '読み込み中...') {
                    descText.textContent = description;
                }
            }
        }
    } catch (error) {
        console.error(`Error fetching: ${subKeyword}`, error);
        subCircle.dataset.description = 'データの取得に失敗しました';

        if (subCircle.dataset.clicked === 'true') {
            const descText = subCircle.querySelector('p');
            if (descText && descText.textContent === '読み込み中...') {
                descText.textContent = 'データの取得に失敗しました';
            }
        }
    }
}

canvas.style.transformOrigin = '0 0';

let currentTranslateX = 0;
let currentTranslateY = 0;
let currentScale = 1;

window.addEventListener('wheel', function (e) {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
        const zoomSpeed = 0.05;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        const newScale = Math.max(0.1, Math.min(5, currentScale + delta));

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const canvasX = (mouseX - currentTranslateX) / currentScale;
        const canvasY = (mouseY - currentTranslateY) / currentScale;

        currentTranslateX = mouseX - canvasX * newScale;
        currentTranslateY = mouseY - canvasY * newScale;

        currentScale = newScale;

        canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    } else {
        currentTranslateX -= e.deltaX;
        currentTranslateY -= e.deltaY;

        canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    }
}, { passive: false });

let touchStartX = 0;
let touchStartY = 0;
let initialDistance = 0;
let initialScale = 1;

window.addEventListener('touchstart', function (e) {
    if (e.target.tagName === 'INPUT') return;

    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);
        initialScale = currentScale;
    }
}, { passive: true });

window.addEventListener('touchmove', function (e) {
    if (e.target.tagName === 'INPUT') return;

    e.preventDefault();

    if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        currentTranslateX += deltaX;
        currentTranslateY += deltaY;

        canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;

        touchStartX = touchX;
        touchStartY = touchY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const newScale = Math.max(0.1, Math.min(5, initialScale * (distance / initialDistance)));
        currentScale = newScale;

        canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    }
}, { passive: false });

// DOM要素の取得
const sidebar = document.getElementById('sidebar');
const chatHistoryContainer = document.getElementById('chatHistory');
const newChatBtn = document.getElementById('newChatBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
let sidebarOpen = true;
let currentChatId = null;
let chatHistory = [];
const viewportCenterX = window.innerWidth / 2;
const viewportCenterY = window.innerHeight / 2;
let focusCirclePosX = viewportCenterX - 1000;
let focusCirclePosY = viewportCenterY - 1000;

// ローカルストレージからチャット履歴を読み込み
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
        chatHistory = [];
    }
}

// チャット履歴を保存
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Failed to save chat history:', error);
    }
}

// ランダムID生成
function generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function init() {
    console.log("Initializing chat system...");
    loadChatHistory();
    setupEventListeners();
    renderChatHistory();
    
    if (chatHistory.length === 0) {
        createNewChat();
    } else {
        currentChatId = chatHistory[0].id;
        loadChat(currentChatId);
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    newChatBtn.addEventListener('click', createNewChat);
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
}

// 現在のキャンバス状態を保存
function saveCurrentCanvasState() {
    if (!currentChatId) return;
    
    const chat = chatHistory.find(c => c.id === currentChatId);
    if (!chat) return;
    
    const circles = Array.from(document.querySelectorAll('.keyword-circle, .new-circle, .circle-no-animation')).map(circle => {
        const computedStyle = window.getComputedStyle(circle);
        const actualWidth = computedStyle.width;
        const actualHeight = computedStyle.height;
        
        let styleText = circle.style.cssText;
        if (!styleText.includes('width') && actualWidth && actualWidth !== '0px') {
            styleText += `width: ${actualWidth};`;
        }
        if (!styleText.includes('height') && actualHeight && actualHeight !== '0px') {
            styleText += `height: ${actualHeight};`;
        }
        
        return {
            className: circle.className,
            style: styleText,
            innerHTML: circle.innerHTML,
            dataset: {...circle.dataset}
        };
    });
    
    const lines = Array.from(document.querySelectorAll('.keyword-line, .line, .line-no-animation')).map(line => {
        const computedStyle = window.getComputedStyle(line);
        const actualHeight = computedStyle.height;
        
        let styleText = line.style.cssText;
        if (!styleText.includes('height') && actualHeight && actualHeight !== '0px') {
            styleText += `height: ${actualHeight};`;
        }
        
        return {
            className: line.className,
            style: styleText,
            dataset: {...line.dataset}
        };
    });
    
    const searchboxState = {
        innerHTML: searchbox.innerHTML,
        style: searchbox.style.cssText
    };
    
    chat.canvasState = {
        circles,
        lines,
        searchbox: searchboxState,
        transform: {
            translateX: currentTranslateX,
            translateY: currentTranslateY,
            scale: currentScale
        }
    };
    
    saveChatHistory();
}

// キャンバスをクリア
function clearCanvas() {
    document.querySelectorAll('.keyword-circle, .new-circle, .circle-no-animation, .keyword-line, .line, .line-no-animation').forEach(el => el.remove());
    
    searchbox.style.width = '300px';
    searchbox.style.height = '300px';
    searchbox.innerHTML = '<input type="text" id="searchInput">';
    
    currentTranslateX = 0;
    currentTranslateY = 0;
    currentScale = 1;
    canvas.style.transform = `translate(0px, 0px) scale(1)`;
    
    const newSearchInput = document.getElementById('searchInput');
    if (newSearchInput) {
        setupSearchInputListener(newSearchInput);
    }
}

// サーチインプットのイベントリスナー設定
function setupSearchInputListener(input) {
    input.addEventListener('keypress', async function (e) {
        if (e.key === 'Enter') {
            const userInput = input.value;

            if (!userInput.trim()) {
                alert('テキストを入力してくださいよね');
                return;
            }

            updateChatTitle(currentChatId, userInput);

            input.style.display = 'none';

            const inputText = document.createElement('p');
            inputText.textContent = userInput;
            inputText.style.color = 'white';
            inputText.style.fontSize = '16px';
            inputText.style.fontWeight = 'bold';
            inputText.style.margin = '0';
            inputText.style.padding = '10px';
            inputText.style.wordWrap = 'break-word';
            inputText.style.maxWidth = '80%';
            inputText.style.textAlign = 'center';

            searchbox.appendChild(inputText);

            let currentSize = parseInt(window.getComputedStyle(searchbox).width);
            let newSize = currentSize + 25;
            searchbox.style.width = newSize + 'px';
            searchbox.style.height = newSize + 'px';

            setTimeout(function () {
                searchbox.style.width = currentSize + 'px';
                searchbox.style.height = currentSize + 'px';
            }, 50);

            try {
                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: userInput
                    })
                });

                const data = await response.json();
                console.log('Full API Response:', JSON.stringify(data, null, 2));

                if (data.error) {
                    throw new Error(data.error.message || JSON.stringify(data.error));
                }

                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content ||
                    !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                    throw new Error('APIからの応答が不完全です');
                }

                const aiResponse = data.candidates[0].content.parts[0].text;
                const keywords = data.keywords || [];

                console.log('Extracted keywords:', keywords);

                const line = document.createElement('div');
                line.className = 'line';
                line.style.left = '50%';
                line.style.top = '50%';
                canvas.appendChild(line);

                const newCircle = document.createElement('div');
                newCircle.className = 'new-circle';
                newCircle.style.left = '50%';
                newCircle.style.top = 'calc(50% + 300px)';

                const responseText = document.createElement('p');
                responseText.textContent = aiResponse;
                responseText.style.color = 'white';
                responseText.style.fontSize = '12px';
                responseText.style.padding = '10px';
                responseText.style.maxWidth = '130px';
                responseText.style.wordWrap = 'break-word';

                newCircle.appendChild(responseText);
                canvas.appendChild(newCircle);

                newCircle.dataset.circleId = `root-circle-${Date.now()}`;
                newCircle.dataset.subKeywords = JSON.stringify(keywords);

                setTimeout(() => {
                    createSubCircles(newCircle, 0, 0);
                }, 1500);

                setTimeout(function () {
                    currentTranslateY -= 300;

                    canvas.style.transition = 'transform 1s ease';
                    canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;

                    setTimeout(function () {
                        canvas.style.transition = '';
                        saveCurrentCanvasState();
                    }, 1000);
                }, 1500);

            } catch (error) {
                console.error('Error:', error);
                alert('エラーが発生しました: ' + error.message);
            }
        }
    });
}

// チャットタイトルを更新
function updateChatTitle(chatId, title) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
        chat.title = title.substring(0, 30);
        saveChatHistory();
        renderChatHistory();
    }
}

// 新しいチャットを作成
function createNewChat() {
    if (currentChatId) {
        saveCurrentCanvasState();
    }
    
    const chatId = generateId();
    const newChat = {
        id: chatId,
        title: '新しいチャット',
        canvasState: null,
        createdAt: new Date().toISOString()
    };
    
    chatHistory.unshift(newChat);
    currentChatId = chatId;
    
    saveChatHistory();
    renderChatHistory();
    
    clearCanvas();
}

// チャットを読み込み
function loadChat(chatId) {
    if (currentChatId && currentChatId !== chatId) {
        saveCurrentCanvasState();
    }
    
    currentChatId = chatId;
    const chat = chatHistory.find(c => c.id === chatId);
    
    if (!chat) return;
    
    clearCanvas();
    
    if (chat.canvasState) {
        restoreCanvasState(chat.canvasState);
    }
    
    renderChatHistory();
}

// キャンバス状態を復元
function restoreCanvasState(state) {
    if (state.searchbox) {
        searchbox.innerHTML = state.searchbox.innerHTML;
        searchbox.style.cssText = state.searchbox.style;
        
        const input = document.getElementById('searchInput');
        if (input) {
            setupSearchInputListener(input);
        }
    }
    
    state.lines.forEach(lineData => {
        const line = document.createElement('div');
        
        line.className = lineData.className;
        line.style.cssText = lineData.style;
        Object.keys(lineData.dataset).forEach(key => {
            line.dataset[key] = lineData.dataset[key];
        });
        
        if (line.classList.contains('line')) {
            line.classList.remove('line');
            line.classList.add('line-no-animation');
        }
        
        canvas.appendChild(line);
    });
    
    state.circles.forEach(circleData => {
        const circle = document.createElement('div');
        circle.className = circleData.className;
        circle.style.cssText = circleData.style;
        circle.innerHTML = circleData.innerHTML;
        Object.keys(circleData.dataset).forEach(key => {
            circle.dataset[key] = circleData.dataset[key];
        });
        
        if (circle.classList.contains('new-circle')) {
            circle.classList.remove('new-circle');
            circle.classList.add('circle-no-animation');
        }
        
        canvas.appendChild(circle);
        
        if (circle.classList.contains('keyword-circle')) {
            const lineId = circle.dataset.lineId;
            const line = document.querySelector(`[data-circle-id="${lineId}"]`);
            const parentId = circle.dataset.parentId;
            let parentCircle = null;
            if (parentId && parentId !== 'root') {
                parentCircle = document.querySelector(`[data-circle-id="${parentId}"]`);
            }
            
            const pos = getCirclePosition(circle);
            let parentX = 0, parentY = 0;
            if (parentCircle) {
                const parentPos = getCirclePosition(parentCircle);
                parentX = parentPos.x;
                parentY = parentPos.y;
            }
            const dx = pos.x - parentX;
            const dy = pos.y - parentY;
            const angle = Math.atan2(dy, dx);
            
            attachCircleClickHandler(circle, line, angle, pos.x, pos.y, parentCircle);
        }
    });
    
    if (state.transform) {
        currentTranslateX = state.transform.translateX;
        currentTranslateY = state.transform.translateY;
        currentScale = state.transform.scale;
        canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    }
}

// チャット履歴を表示
function renderChatHistory() {
    chatHistoryContainer.innerHTML = '';
    
    chatHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-item-title';
        titleSpan.textContent = chat.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chat-item-delete';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };
        
        chatItem.appendChild(titleSpan);
        chatItem.appendChild(deleteBtn);
        
        chatItem.onclick = () => {
            loadChat(chat.id);
        };
        
        chatHistoryContainer.appendChild(chatItem);
    });
}

// チャットを削除
function deleteChat(chatId) {
    if (chatHistory.length === 1) {
        alert('新しいチャットを作成します');
        createNewChat();
        return;
    }
    
    if (!confirm('このチャットを削除しますか？')) {
        return;
    }
    
    chatHistory = chatHistory.filter(c => c.id !== chatId);
    saveChatHistory();
    
    if (currentChatId === chatId) {
        if (chatHistory.length > 0) {
            loadChat(chatHistory[0].id);
        }
    } else {
        renderChatHistory();
    }
}

// サイドバーの表示/非表示
function toggleSidebar() {
    console.log("sidebar");
    sidebarOpen = !sidebarOpen;
    
    if (sidebarOpen) {
        sidebar.classList.remove('hidden');
        toggleSidebarBtn.classList.add('sidebar-open');
        toggleSidebarBtn.classList.remove('sidebar-closed');
    } else {
        sidebar.classList.add('hidden');
        toggleSidebarBtn.classList.remove('sidebar-open');
        toggleSidebarBtn.classList.add('sidebar-closed');
    }
}

toggleSidebarBtn.classList.add('sidebar-open');

console.log("Initializing app...");
init();


const centerButton = document.querySelector('.center-button');
console.log("centerButton", centerButton);

centerButton.addEventListener("click", function(){
    focusMove()
});

function focusMove() {
    // キャンバスの初期位置（searchboxが画面中央にくる位置）に戻す
    currentTranslateX = focusCirclePosX;
    currentTranslateY = focusCirclePosY;
    currentScale = 1;
    console.log("currentTranslateX",viewportCenterX,viewportCenterY);
    
    // スムーズなアニメーション付きで移動
    canvas.style.transition = 'transform 0.5s ease';
    canvas.style.transform = `translate(${focusCirclePosX}px, ${focusCirclePosY}px) scale(${currentScale})`;

    console.log("キャンバスを中央にリセットしました", focusCirclePosX,focusCirclePosY);
    setTimeout(() => {
        canvas.style.transition = '';
    }, 500);
}

// カードの展開・折りたたみ機能（グローバルスコープに配置）
window.toggleCard = function(header) {
    const card = header.closest('.sidebar-footer');
    const wasActive = card.classList.contains('active');
    if (wasActive) {
        card.classList.remove('active');
    } else {
        card.classList.add('active');
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // キーボードアクセシビリティのサポート
    document.querySelectorAll('.card-header').forEach(header => {
        header.setAttribute('tabindex', '0');
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', 'false');
        
        header.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCard(this);
                this.setAttribute('aria-expanded', 
                    this.parentElement.classList.contains('active'));
            }
        });
    });
});