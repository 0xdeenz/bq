import { useState } from "react"
import { NavLink } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import styled from "styled-components"
import { FaPlus, FaArrowRight } from 'react-icons/fa'
import { CopyIcon } from '@chakra-ui/icons'
import { PinAngle } from '@styled-icons/bootstrap/PinAngle'
import Spinner from 'react-bootstrap/Spinner';

import { setModal } from '../../state/modal/reducer';
import { setError } from '../../state/error/reducer';
import { AddElementButton, AdvanceSectionButton, UploadButton } from "../../components/Button"
import Question from "./Question"
import { MAX_QUESTIONS, MAX_ANSWERS } from "../../constants/values"
import { theme } from "../../theme"
import { 
    getNumberOfQuestions, 
    getSolutionHash, 
    generateMarkdownFile, 
    getNumberOfAnswers, 
    getNullAnswersDict, 
    getNullAnswersFirstEmptyDict, 
    shiftKeysInAnswersDict, 
    makeStorageClient
} from "./helpers"
import TitleAndDescription from "./TitleAndDescription"

const PublishWrapper = styled.div`
    width:  100%;
    min-height: 58vh;
`

const SectionTitle = styled.div`
    font-size: 1.7rem;
    color: var(--alt-text);
    padding-top: 30px;
    padding-bottom: 10px;
`

const SectionSubTitle = styled.div`
    font-size: 1.2rem;
    font-family: 'Inter ExtraLight';
    color: var(--main-text);
    padding-bottom: 30px;
`

const InlineLink = styled.a`
    font-weight: 600;

    &:hover {
        color: var(--alt-text);
    }
`

const InlineNavLink = styled(NavLink)`
    font-family: 'Inter ExtraLight';
    text-decoration: none;
    cursor: pointer;
    color: var(--alt-text);
`

const InlineButton = styled.button`
    font-family: 'Inter ExtraLight';
    cursor: pointer;
    color: var(--alt-text);
`

const QuestionsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`

const ButtonsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 50px;

    @media (max-width: ${theme.breakpoint}px) {
        flex-direction: column;
    }
`

const Pin = styled(PinAngle)`
    height: 55%;
`

const noQuestionErrors = []
for (var i = 1; i <= MAX_QUESTIONS; i++) {
    noQuestionErrors.push(false)
}
const noErrors = {
    titleAndDescription: false,
    questions: noQuestionErrors
}

export default function PublishQuestions ({ test, setTest, correctAnswers, setCorrectAnswers, submission, setSubmission, advanceSection }) {
    
    const [errors, setErrors] = useState(noErrors);
    const [awaiting, setAwaiting] = useState("");

    const dispatch = useDispatch()

    const handlePinClick = async () => {
        setAwaiting("Generating file")

        // 1 - check if title and description are defined
        if (test.title === "" || test.description === "") {
            setErrors( prevState => ({
                ...prevState,
                titleAndDescription: true
            }))
            dispatch(setError(['Title and description not defined', 'Make sure your multiple choice test includes both a title and description']))
            dispatch(setModal('error'))
            setAwaiting("")
            return
        } else {
            setErrors( prevState => ({
                ...prevState,
                titleAndDescription: false
            }))
        }

        // 2 - check if all the questions are defined
        let allQuestionsDefinedAndAnswered = true;
        const _errors = [...noQuestionErrors];
        Object.entries(test).map(([ key, value ]) => {
            if (key === 'title' || key === 'description') {
                return null
            }
            if (value.Q === "") {
                allQuestionsDefinedAndAnswered = false
                _errors[parseInt(key.substring(1)) - 1] = true
                return
            }
            Object.entries(value.A).map(([ _key, _value ]) => {
                if (_value === "") {
                    allQuestionsDefinedAndAnswered = false
                    _errors[parseInt(key.substring(1)) - 1] = true
                    return
                }
            })
        })
        if ( !allQuestionsDefinedAndAnswered ) {
            setErrors( prevState => ({
                ...prevState,
                questions: _errors
            }))
            dispatch(setError(['Some questions are not defined', 'Make sure all questions and answers have their content defined']))
            dispatch(setModal('error'))
            setAwaiting("")
            return
        }

        // 3 - check if correctAnswer is defined for all defined questions
        const nQuestions = getNumberOfQuestions(test)
        for ( var i = 0; i < nQuestions; i++) {
            if (correctAnswers[i] === 0) {
                allQuestionsDefinedAndAnswered = false
                _errors[i] = true
            }
        }
        if ( !allQuestionsDefinedAndAnswered ) {
            setErrors( prevState => ({
                ...prevState,
                questions: _errors
            }))
            dispatch(setError(['Some questions are not answered', 'Make sure you defined all the correct answers for your questions']))
            dispatch(setModal('error'))
            setAwaiting("")
            return
        }

        setErrors(noErrors)

        const markdownFile = generateMarkdownFile(test)

        const onRootCidReady = cid => {
            setAwaiting('Uploading...')
        }
        
        // when each chunk is stored, update the percentage complete and display
        const totalSize = markdownFile.size
        let uploaded = 0
        
        const onStoredChunk = size => {
            uploaded += size
            const pct = 100 * (uploaded / totalSize)
            setAwaiting(`Uploading... ${pct.toFixed(2)}%`)
        }

        const client = makeStorageClient()
        const ipfsPin = await client.put([markdownFile], { onRootCidReady, onStoredChunk, wrapWithDirectory: false })
        const testerURI = 'https://' + ipfsPin + '.ipfs.dweb.link/'
        const solutionHash = getSolutionHash(correctAnswers)

        
        setSubmission( prevState => ({
            ...prevState,
            'testerURI': {value: testerURI, error: ""},
            'solutionHash': {value: solutionHash, error: ""},
            '_pinnedTester': testerURI,
        }))
       
        setAwaiting("")
    }

    const handleCopyClick = () => {
        const pin = submission._pinnedTester
        navigator.clipboard.writeText(pin)
    }


    const addQuestion = () => {
        let len = getNumberOfQuestions(test)
        let newKey = 'Q' + (len + 1)
        setTest( prevState => ({
            ...prevState,
            [newKey]: { Q: "", A: getNullAnswersFirstEmptyDict(newKey) }
        }))
    }

    const removeQuestion = (keyToRemove) => {
        const toRemove = parseInt(keyToRemove.substring(1))
        setTest( prevState => {
            const _state = {...prevState}
            for (var i = toRemove; i < MAX_QUESTIONS; i++) {
                _state['Q' + i] = {
                    Q: _state['Q' + (i + 1)].Q,
                    A: shiftKeysInAnswersDict('Q' + (i + 1), _state['Q' + (i + 1)].A, 'Q' + i)
                }
            }
            _state['Q' + MAX_QUESTIONS] = { Q: null, A: getNullAnswersDict('Q' + MAX_QUESTIONS) }
            return _state
        })
        
        const index = toRemove - 1
        setErrors( prevState => {
            const _questionsErrors = [...prevState.questions]
            for (var i = index; i < MAX_QUESTIONS - 1; i++) {
                _questionsErrors[i] = _questionsErrors[i + 1]
            }
            _questionsErrors[MAX_QUESTIONS - 1] = false;
            return {
                ...prevState,
                questions: _questionsErrors
            }
        })
    }

    const addAnswer = (questionKey) => {
        let len = getNumberOfAnswers(test[questionKey].A)
        let newKey = questionKey + 'A' + (len + 1)
        setTest( prevState => {
            const _state = {...prevState}
            _state[questionKey].A[newKey] = ""
            return _state
        })
    }

    const removeAnswer = (questionKey, keyToRemove) => {
        // shifting answer boxes
        const toRemove = parseInt(keyToRemove.split('A')[1])
        setTest( prevState => {
            const _answers = {...prevState[questionKey].A}
            for (var i = toRemove; i < MAX_ANSWERS; i++) {
                _answers[questionKey + 'A' + i] = _answers[questionKey + 'A' + (i + 1)]
            }
            _answers[questionKey + 'A' + MAX_ANSWERS] = null
            return { 
                ...prevState,
                [questionKey]: {
                    ...prevState[questionKey],
                    A: _answers
                }
            }
        })
        // changing correct answer as well
        const questionIndex = parseInt(questionKey.substring(1)) - 1
        setCorrectAnswers( prevState => {
            const _answer = prevState[questionIndex]
            let answer = 0
            if ( _answer === 0 || toRemove === answer) {
                answer = 0
            } else if (toRemove > _answer) {
                answer = _answer
            } else if (toRemove < _answer) {
                answer = _answer - 1
            }
            return [
                ...prevState.slice(0, questionIndex),
                answer,
                ...prevState.slice(questionIndex + 1),
            ]
        })
    }

    const setQuestionText = (key, _questionText) => {
        setTest( prevState => {
            const _state = {...prevState}
            _state[key].Q = _questionText
            return _state
        })
    }

    const setAnswerText = (key, answerKey, _answerText) => {
        setTest( prevState => {
            const _state = {...prevState}
            _state[key].A[answerKey] = _answerText
            return _state
        })
    }

    const setCorrectAnswer = (questionKey, answer) => {
        const questionIndex = parseInt(questionKey.substring(1)) - 1
        setCorrectAnswers( prevState => {
            return [
                ...prevState.slice(0, questionIndex),
                answer,
                ...prevState.slice(questionIndex + 1),
            ]
        })
    }

    const questionBoxes = Object.entries(test).map(( [key, value] ) => {
        if (key === 'title' || key === 'description') {
            return null
        }
        return(
            value.Q === null ?
                null
            :
                <Question 
                    id={key}
                    key={key}
                    testQuestion={test[key]}
                    setQuestionText={(questionText) => setQuestionText(key, questionText)}
                    addAnswer={() => addAnswer(key)}
                    removeAnswer={(keyToRemove) => removeAnswer(key, keyToRemove)}
                    correctAnswer={correctAnswers[parseInt(key.substring(1)) - 1]}
                    setCorrectAnswer={(answer) => setCorrectAnswer(key, answer)}
                    setAnswerText={(answerKey, answerText) => setAnswerText(key, answerKey, answerText)}
                    isRemovable={test.Q2.Q !== null}
                    removeQuestion={() => { removeQuestion(key) }}
                    hasError={errors.questions[parseInt(key.substring(1)) - 1]}
                />
        )
    })

    return(
        <PublishWrapper key='publishWrapper'>
            <SectionTitle>
                Step 1: Create your multiple choice test in
                <InlineLink  href='https://www.markdownguide.org/basic-syntax/' target='_blank' aria_label='Markdown guide'> markdown </InlineLink>
                and publish it to IPFS
            </SectionTitle>
            <SectionSubTitle>
                If you already uploaded your
                <InlineNavLink to="/help"> supported markdown file, </InlineNavLink>
                you can <InlineButton onClick={advanceSection}>skip this step.</InlineButton>
            </SectionSubTitle>
            <QuestionsWrapper>
                <TitleAndDescription 
                    test={test}
                    setTest={setTest}
                    hasError={errors.titleAndDescription}
                />
                {questionBoxes}
                {
                    getNumberOfQuestions(test) === MAX_QUESTIONS ? 
                        null
                    :
                        <AddElementButton onClick={addQuestion}><FaPlus />&nbsp;&nbsp;Add Question</AddElementButton>
                }
            </QuestionsWrapper>
            <ButtonsWrapper>
                {
                    submission._pinnedTester ? 
                        <>
                            <UploadButton key='hash' onClick={handleCopyClick}>
                                <CopyIcon />&nbsp;&nbsp;Copy IPFS link
                            </UploadButton>
                            <AdvanceSectionButton onClick={advanceSection}>Advance section&nbsp;&nbsp;<FaArrowRight /></AdvanceSectionButton>
                        </>
                    : 
                        <UploadButton key='ipfs' disabled={!!awaiting} onClick={handlePinClick}>
                            {
                                !!awaiting ? 
                                    <>  
                                        {awaiting}&nbsp;&nbsp;
                                        <Spinner animation="border" size="sm" />
                                    </>
                                :
                                    <><Pin />&nbsp;&nbsp;Pin to IPFS</>
                            }
                        </UploadButton>
                }
                
            </ButtonsWrapper>
        </PublishWrapper>
    )
}