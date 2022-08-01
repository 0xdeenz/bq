/* global BigInt */
import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import styled from "styled-components"
import { SubmitButton } from "../../components/Button"
import { isValidAddress } from "../../hooks/utils"

const SectionTitle = styled.div`
    font-size: 1.7rem;
    color: var(--alt-text);
    padding-top: 30px;
    padding-bottom: 30px;
`

const SubmitBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; 

    width:  25%;
    min-width: 380px;
    border-radius: 5px;
    padding: 5px 15px 5px 15px;

    margin: 4px 10px 4px 10px;
    box-shadow: 2px 2px 2px 1px var(--main-text);
    border: 1px solid var(--main-text);
    background-color: transparent;
`

const SubmitWrapper = styled.div`
    width: 100%;
    padding-top: 20px;
`

const SpecialInputRow = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    padding-bottom: 20px;
`

const PrizeInputWrapper = styled.div`
    width: 100%;
    height: 85px;
    display: flex;
    flex-direction: column;
    text-align: justify;
    text-justify: inter-word;
`

const InputWrapper = styled.div`
    padding: 0px 10px 0px 10px;
    height: 85px;
    width: 100%;
    display: flex;
    flex-direction: column;
`

const InputName = styled.div`
    font-family: 'Inter Bold';
    text-align: justify;
    text-justify: inter-word;
`

const InputBox = styled.input`
    width: 100%;
    border-radius: 5px;
    padding: 3px 0 3px 10px;
    margin: 4px 0px 4px 0px;
    box-shadow: 2px 2px 2px 1px var(--main-text);
    border: 1px solid var(--main-text);
    text-align: justify;
    text-justify: inter-word;

    transition: all 0.1s ease-in-out;

    ::placeholder {
        font-family: 'Inter ExtraLightItalic';
    }

    &:focus {
        outline: 0;
        border: 1px solid var(--alt-text);
        box-shadow: 0 0 0 white;
        margin: 6px 0px 2px 0px;
    }
`

const ErrorText = styled.div`
    font-family: 'Inter ExtraLightItalic';
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--error);
    text-align: justify;
    text-justify: inter-word;
`

const PrizeInputBoxWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`

const PrizeInputCurrency = styled.div`
    width: 100%;
    font-weight: 800;
    font-family: 'Inter ExtraLight';
    margin-left: -20px;
    padding-left: 15px;
`

const InlineNavLink = styled(NavLink)`
    font-family: 'Inter Bold';
    cursor: pointer;
    color: var(--alt-text);
`

const Buffer = styled.div`
    width: 30px;
`

const ButtonWrapper = styled.div`
    padding-bottom: 20px;
`



// credential name
// tester IPFS link - URI
// solution hash
// time limit - for now just raw integer
// credential limit
// needed pass
// prize


export default function SubmitCredential () {
    const [isEnabled, setIsEnabled] = useState(false);
    const [submission, setSubmission] = useState({
        credentialName: {value: "", error: ""},
        testerURI: {value: "", error: ""},
        solutionHash: {value: "", error: ""},
        neededPass: {value: "", error: ""},
        credentialLimit: {value: "", error: ""},
        timeLimit: {value: "", error: ""},
        prize: {value: "", error: ""},
    })

    const inputs = [
        { name: 'credentialName', placeholder: "Name your credential", label: 'Credential name' },
        { name: 'testerURI', placeholder: "Upload your test to IPFS and link it here", label: (<><InlineNavLink to='/help'>Supported markdown</InlineNavLink> tester URI</>) },
        { name: 'solutionHash', placeholder: "Solution hash of your multiple choice test", label: 'Answers tree root'},
        { name: 'neededPass', placeholder: "Leave empty if not needed", label: 'NFT pass required to solve' },
        { name: 'timeLimit', placeholder: "Leave empty for unlimited", label: 'Test deadline' },
    ]

    //returns an error string, empty if validated
    const validate = ({name, value}) => {
        // TODO: actually check if the smart contract supports `balanceOf`
        if (name === 'neededPass') {
            return (!isValidAddress(value) && !!value) ? 'Not a valid contract address' : ''
        } 

        if (name === 'solutionHash') {
            const solutionHashRegex = /^[0-9]{70,78}$/
            return (!solutionHashRegex.test(value) || BigInt(value) >= BigInt(2**256 - 1)) ? 
                'Not a valid solution hash'
            :
                ''
        }

        if (name === 'credentialLimit') {
            const isValidCredential = /^[0-9]{0,10}$/.test(value)
            return !isValidCredential ? 
                'Invalid credential limit'
            : 
                (isValidCredential && (BigInt(value) >= BigInt(2**32 - 1))) ? 'Credential limit too high' : ""
        }
        
        // TODO: be able to set time limit on a calendar
        if (name === 'timeLimit') {
            const isValidTime = /^[0-9]{0,10}$/.test(value)
            return !isValidTime ? 
                'Invalid time limit'
            :
                (isValidTime && (BigInt(value) >= BigInt(2**32 - 1))) ? 'Time limit too high' : ""
        }

        if (name === 'prize') {
            return value === "" ? "" 
                :
                !/^\d+\.?\d{0,2}$/.test(value) ? 'Invalid prize' : ""
        }
    }

    useEffect(() => {
        let _isEnabled = true
        for (const [key, value] of Object.entries(submission)) {
            // what is the value of value: value.value ? 
            if (validate({name: key, value: value.value})) {  // current entries must have no errors
                _isEnabled = false
            }
            if ( ['credentialName', 'testerURI', 'solutionHash'].includes(key) && !value.value ) {  // and necessary ones must be defined
                _isEnabled = false
                console.log('empty entries')
            }
        }
        setIsEnabled(_isEnabled)
    }, [submission])

    // submits the tx onto the blockchain
    const handleSubmit = () => {

    }

    const handleChange = event => {
        const { name, value } = event.target;

        const _error = validate({name,  value})

        if(!_error) {  // if no errors, update clean with value
            setSubmission( prevState => ({
                ...prevState,
                [name]: { value: value, error: "" }
            }))
        } else {  // if error, dont update value
            setSubmission( prevState => ({
                ...prevState,
                [name]: { value: prevState[name].value, error: _error }
            }))
        }
    }

    const inputItems = inputs.map(( item, index) => {
        return(
            <InputWrapper key={item.name}>
                <InputName>{item.label}</InputName>
                <InputBox 
                    type='text'
                    name={item.name}
                    id={item.name}
                    required
                    onChange={handleChange}
                    placeholder={item.placeholder}
                    value={submission[item.name].value}
                />
                <ErrorText>{submission[item.name].error}</ErrorText>
            </InputWrapper>
        )
    })

    return(
        <>
            <SectionTitle>
                    Step 2: Define your credential and submit it to the blockchain
                </SectionTitle>
            <SubmitBox>
                <SubmitWrapper>
                    {inputItems}
                </SubmitWrapper>
                <SpecialInputRow>
                    <InputWrapper>
                        <InputName>Max. credentials</InputName>
                        <InputBox              
                            type='text'
                            name='credentialLimit'
                            id='credentialLimit'
                            required
                            onChange={handleChange}
                            placeholder='Empty for unlimited'
                            value={submission.credentialLimit.value}
                        />
                        <ErrorText>{submission.credentialLimit.error}</ErrorText>
                    </InputWrapper>
                    <Buffer />
                    <PrizeInputWrapper>
                        <InputName>Prize to first solver</InputName>
                            <PrizeInputBoxWrapper>
                                <InputBox 
                                    type='text'
                                    name='prize'
                                    id='prize'
                                    required
                                    onChange={handleChange}
                                    placeholder='0'
                                    value={submission.prize.value}
                                />
                                <PrizeInputCurrency>MATIC</PrizeInputCurrency>
                            </PrizeInputBoxWrapper>
                        <ErrorText>{submission.prize.error}</ErrorText>
                    </PrizeInputWrapper>
                </SpecialInputRow>
                <ButtonWrapper>
                    <SubmitButton disabled={!isEnabled} isEnabled={isEnabled} onClick={handleSubmit}>
                        Create your credential
                    </SubmitButton>
                </ButtonWrapper>
            </SubmitBox>
        </>
    )
}