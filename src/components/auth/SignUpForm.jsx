
function SignUpForm() {
    return (
        <form className="signup-form">

            <div className='form-input'>
                <label>Name</label>
                <input
                    type='text'
                    name='userName'
                    placeholder='Enter your name'
                />
            </div>

            <div className='form-input'>
                <label>Email Address</label>
                <input
                    type='email'
                    name='userEmail'
                    placeholder='Enter your email'
                    autoComplete="email"
                />
            </div>

            <div className='form-input'>
                <label>Password</label>
                <input
                    type='password'
                    name='userPassword'
                    placeholder='Enter your password'
                    autoComplete='new-password'
                />
            </div>

            <div className='terms-input'>
                <input
                    type='checkbox'
                    name='checkAcceptTerms'
                />
                <label>I agree to the <span>terms & policy</span></label>
            </div>

            <button className="submit-button" type="submit">Signup</button>

        </form>
    );
}

export default SignUpForm