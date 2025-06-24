@csrf_exempt
@login_required
def validate_coupon_ajax(request):
    """AJAX view to validate coupon code"""
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        coupon_code = data.get('coupon_code', '').upper().strip()
        
        if not coupon_code:
            return JsonResponse({
                'valid': False,
                'message': 'Please enter a coupon code'
            })
        
        try:
            coupon = Coupon.objects.get(code=coupon_code)
            
            # Get cart information for validation
            cart, created = Cart.objects.get_or_create(user=request.user)
            cart_items = cart.items.all()
            
            if not cart_items:
                return JsonResponse({
                    'valid': False,
                    'message': 'Your cart is empty'
                })
            
            # Calculate order amount
            order_amount = sum(item.chart.price for item in cart_items)
            
            # Get chart objects for validation
            charts = [item.chart for item in cart_items]
            
            # Validate coupon
            is_valid, message = coupon.is_valid(
                user=request.user,
                order_amount=order_amount,
                charts=charts
            )
            
            if is_valid:
                # Calculate discount
                discount_amount = coupon.calculate_discount(order_amount)
                
                return JsonResponse({
                    'valid': True,
                    'message': f'Coupon applied! You save ${discount_amount:.2f}',
                    'discount_amount': float(discount_amount),
                    'discount_type': coupon.discount_type,
                    'discount_value': float(coupon.discount_value),
                    'coupon_name': coupon.name,
                    'coupon_description': coupon.description
                })
            else:
                return JsonResponse({
                    'valid': False,
                    'message': message
                })
                
        except Coupon.DoesNotExist:
            return JsonResponse({
                'valid': False,
                'message': 'Invalid coupon code'
            })
        except Exception as e:
            return JsonResponse({
                'valid': False,
                'message': f'Error validating coupon: {str(e)}'
            })
    
    return JsonResponse({'valid': False, 'message': 'Invalid request'})


@csrf_exempt
@login_required
def apply_coupon_ajax(request):
    """AJAX view to apply coupon to user's session"""
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        coupon_code = data.get('coupon_code', '').upper().strip()
        
        if not coupon_code:
            return JsonResponse({
                'success': False,
                'message': 'Please enter a coupon code'
            })
        
        try:
            coupon = Coupon.objects.get(code=coupon_code)
            
            # Get cart information
            cart, created = Cart.objects.get_or_create(user=request.user)
            cart_items = cart.items.all()
            
            if not cart_items:
                return JsonResponse({
                    'success': False,
                    'message': 'Your cart is empty'
                })
            
            # Calculate order amount
            order_amount = sum(item.chart.price for item in cart_items)
            
            # Get chart objects for validation
            charts = [item.chart for item in cart_items]
            
            # Validate coupon
            is_valid, message = coupon.is_valid(
                user=request.user,
                order_amount=order_amount,
                charts=charts
            )
            
            if is_valid:
                # Calculate discount
                discount_amount = coupon.calculate_discount(order_amount)
                
                # Store coupon in session
                request.session['applied_coupon'] = {
                    'id': coupon.id,
                    'code': coupon.code,
                    'discount_amount': float(discount_amount),
                    'discount_type': coupon.discount_type,
                    'discount_value': float(coupon.discount_value)
                }
                
                # Calculate new totals
                processing_fee = order_amount * Decimal('0.055')
                total_after_discount = order_amount - discount_amount + processing_fee
                
                return JsonResponse({
                    'success': True,
                    'message': f'Coupon "{coupon.code}" applied successfully!',
                    'discount_amount': float(discount_amount),
                    'new_total': float(total_after_discount),
                    'processing_fee': float(processing_fee),
                    'coupon_name': coupon.name
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': message
                })
                
        except Coupon.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Invalid coupon code'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error applying coupon: {str(e)}'
            })
    
    return JsonResponse({'success': False, 'message': 'Invalid request'})


@csrf_exempt
@login_required
def remove_coupon_ajax(request):
    """AJAX view to remove applied coupon from session"""
    if request.method == 'POST':
        if 'applied_coupon' in request.session:
            del request.session['applied_coupon']
            request.session.modified = True
            
            # Recalculate totals
            cart, created = Cart.objects.get_or_create(user=request.user)
            cart_items = cart.items.all()
            
            if cart_items:
                order_amount = sum(item.chart.price for item in cart_items)
                processing_fee = order_amount * Decimal('0.055')
                total_amount = order_amount + processing_fee
                
                return JsonResponse({
                    'success': True,
                    'message': 'Coupon removed successfully',
                    'new_total': float(total_amount),
                    'processing_fee': float(processing_fee)
                })
        
        return JsonResponse({
            'success': False,
            'message': 'No coupon applied'
        })
    
    return JsonResponse({'success': False, 'message': 'Invalid request'})
